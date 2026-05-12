/* ============================================
   APP.JS - Main Application Logic
   ============================================ */

// ============================================
// APP STATE
// ============================================

const APP = {
    data: null,
    chart: null,
    refreshInterval: null,
    isConnected: false,
};

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    // Auth guard - redirect to login if not authenticated
    if (!AuthService.requireAuth()) return;

    initUserProfile();
    initClock();
    initSidebar();
    initUserDropdown();
    initEventListeners();
    await loadDashboard();
    AuthService.applyPermissions();
    startAutoRefresh();
});

// ============================================
// USER PROFILE & AUTH UI
// ============================================

function initUserProfile() {
    const session = AuthService.getSession();
    if (!session) return;

    // Update top bar user info
    const userName = document.getElementById('userName');
    const userRoleBadge = document.getElementById('userRoleBadge');
    const dropdownUserName = document.getElementById('dropdownUserName');
    const dropdownUserRole = document.getElementById('dropdownUserRole');

    if (userName) userName.textContent = session.nombre;
    if (userRoleBadge) {
        userRoleBadge.textContent = session.rolLabel;
        userRoleBadge.style.background = `${session.rolColor}22`;
        userRoleBadge.style.color = session.rolColor;
        userRoleBadge.style.borderColor = `${session.rolColor}44`;
    }
    if (dropdownUserName) dropdownUserName.textContent = session.nombre;
    if (dropdownUserRole) dropdownUserRole.textContent = session.rolLabel;
}

function initUserDropdown() {
    const userInfo = document.getElementById('userInfo');
    const btnLogout = document.getElementById('btnLogout');
    const sidebarLogout = document.getElementById('sidebarLogout');

    // Toggle dropdown
    userInfo?.addEventListener('click', (e) => {
        e.stopPropagation();
        userInfo.classList.toggle('open');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
        userInfo?.classList.remove('open');
    });

    // Prevent dropdown close when clicking inside it
    document.getElementById('userDropdown')?.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // Logout buttons
    btnLogout?.addEventListener('click', (e) => {
        e.preventDefault();
        AuthService.logout();
    });

    sidebarLogout?.addEventListener('click', (e) => {
        e.preventDefault();
        AuthService.logout();
    });
}

// ============================================
// LOAD DASHBOARD DATA
// ============================================

async function loadDashboard() {
    try {
        showConnectionStatus('loading', 'Cargando datos...');
        APP.data = await dataService.fetchAllData();

        updateSummaryCards(APP.data.resumen);
        updateDonutChart(APP.data.resumen);
        updateLastEntries(APP.data.movimientos);
        updateTopVehicles(APP.data.top_vehiculos);
        updateDebtors(APP.data.deudores);
        updateFooterStats(APP.data.estadisticas);
        updateQuickStats(APP.data.resumen);
        renderOccupation24hChart(APP.data.ocupacion_24h);

        const source = SHEETS_CONFIG.USAR_SHEETS ? 'Google Sheets' : 'datos locales';
        showConnectionStatus('connected', `Conectado (${source})`);
        APP.isConnected = true;

    } catch (error) {
        console.error('Error loading dashboard:', error);
        showConnectionStatus('disconnected', 'Error de conexión');
    }
}

// ============================================
// AUTO REFRESH
// ============================================

function startAutoRefresh() {
    if (APP.refreshInterval) clearInterval(APP.refreshInterval);

    APP.refreshInterval = setInterval(async () => {
        await loadDashboard();
    }, SHEETS_CONFIG.REFRESH_INTERVAL);
}

// ============================================
// CLOCK
// ============================================

function initClock() {
    updateClock();
    setInterval(updateClock, 1000);
}

function updateClock() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateStr = now.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });

    const clockTime = document.getElementById('clockTime');
    const clockDate = document.getElementById('clockDate');

    if (clockTime) clockTime.textContent = timeStr;
    if (clockDate) clockDate.textContent = dateStr;
}

// ============================================
// SIDEBAR
// ============================================

function initSidebar() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebarClose = document.getElementById('sidebarClose');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const sidebar = document.getElementById('sidebar');

    menuToggle?.addEventListener('click', () => toggleSidebar(true));
    sidebarClose?.addEventListener('click', () => toggleSidebar(false));
    sidebarOverlay?.addEventListener('click', () => toggleSidebar(false));
}

function toggleSidebar(open) {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    sidebar?.classList.toggle('open', open);
    overlay?.classList.toggle('active', open);
    document.body.style.overflow = open ? 'hidden' : '';
}

// ============================================
// EVENT LISTENERS
// ============================================

function initEventListeners() {
    // Barrier button (with permission check)
    document.getElementById('btnBarrier')?.addEventListener('click', () => {
        if (!AuthService.hasPermission('abrir_barrera')) {
            showToast('error', 'No tenés permisos para abrir la barrera');
            return;
        }
        showToast('success', 'Barrera abierta correctamente');
        animateBarrierButton();
    });

    // History button
    document.getElementById('btnHistorial')?.addEventListener('click', () => {
        if (!AuthService.hasPermission('ver_historial')) {
            showToast('error', 'No tenés permisos para ver el historial');
            return;
        }
        showToast('success', 'Historial completo - Próximamente');
    });

    // All vehicles button
    document.getElementById('btnAllVehicles')?.addEventListener('click', () => {
        if (!AuthService.hasPermission('ver_vehiculos')) {
            showToast('error', 'No tenés permisos para ver vehículos');
            return;
        }
        showToast('success', 'Lista de vehículos - Próximamente');
    });

    // View all debtors
    document.getElementById('btnViewAllDebtors')?.addEventListener('click', () => {
        if (!AuthService.hasPermission('ver_deudas')) {
            showToast('error', 'No tenés permisos para ver deudores');
            return;
        }
        showToast('success', 'Todos los deudores - Próximamente');
    });

    // Collect debt
    document.getElementById('btnCollectDebt')?.addEventListener('click', () => {
        if (!AuthService.hasPermission('cobrar_deudas')) {
            showToast('error', 'No tenés permisos para cobrar deudas');
            return;
        }
        showToast('success', 'Módulo de cobro - Próximamente');
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            toggleSidebar(false);
            document.getElementById('userInfo')?.classList.remove('open');
        }
    });
}

function animateBarrierButton() {
    const btn = document.getElementById('btnBarrier');
    if (!btn) return;

    btn.style.transform = 'scale(0.95)';
    btn.innerHTML = '<i class="fas fa-check-circle"></i> BARRERA ABIERTA';
    btn.style.background = 'linear-gradient(135deg, #16a34a, #15803d)';

    setTimeout(() => {
        btn.style.transform = '';
        btn.innerHTML = '<i class="fas fa-dungeon"></i> ABRIR BARRERA';
        btn.style.background = '';
    }, 3000);
}

// ============================================
// UPDATE SUMMARY CARDS
// ============================================

function updateSummaryCards(resumen) {
    animateValue('totalPlaces', resumen.total);
    animateValue('freePlaces', resumen.libres);
    animateValue('occupiedPlaces', resumen.ocupados);

    document.getElementById('todayRevenue').textContent = `$ ${formatNumber(resumen.recaudacion_hoy)}`;
    document.getElementById('freePercent').textContent = `${resumen.porcentaje_libre}% disponible`;
    document.getElementById('occupiedPercent').textContent = `${resumen.porcentaje_ocupado}% ocupados`;
}

// ============================================
// QUICK STATS (Top Bar)
// ============================================

function updateQuickStats(resumen) {
    document.getElementById('qsTotales').textContent = resumen.total;
    document.getElementById('qsLibres').textContent = resumen.libres;
    document.getElementById('qsOcupados').textContent = resumen.ocupados;
    document.getElementById('qsRecaudacion').textContent = formatNumber(resumen.recaudacion_hoy);
}

// ============================================
// DONUT CHART
// ============================================

function updateDonutChart(resumen) {
    const circumference = 2 * Math.PI * 80; // r=80
    const offset = circumference - (resumen.porcentaje_ocupado / 100) * circumference;

    const donutFill = document.getElementById('donutFill');
    if (donutFill) {
        donutFill.style.strokeDasharray = circumference;
        // Trigger animation
        requestAnimationFrame(() => {
            donutFill.style.strokeDashoffset = offset;
        });
    }

    // Update color based on occupancy
    let color = '#f59e0b'; // orange default
    if (resumen.porcentaje_ocupado >= 80) color = '#ef4444'; // red
    else if (resumen.porcentaje_ocupado <= 40) color = '#22c55e'; // green

    if (donutFill) donutFill.style.stroke = color;

    const donutPercent = document.getElementById('donutPercent');
    if (donutPercent) {
        donutPercent.textContent = `${resumen.porcentaje_ocupado}%`;
        donutPercent.style.color = color;
    }

    document.getElementById('legendOccupied').textContent = `${resumen.ocupados} (${resumen.porcentaje_ocupado}%)`;
    document.getElementById('legendFree').textContent = `${resumen.libres} (${resumen.porcentaje_libre}%)`;
}

// ============================================
// OCCUPATION 24H CHART (Chart.js)
// ============================================

function renderOccupation24hChart(data) {
    const ctx = document.getElementById('occupation24hCanvas');
    if (!ctx) return;

    // Destroy existing chart
    if (APP.chart) {
        APP.chart.destroy();
    }

    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 150);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.01)');

    APP.chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Ocupación',
                data: data.data,
                borderColor: '#3b82f6',
                backgroundColor: gradient,
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 5,
                pointHoverBackgroundColor: '#3b82f6',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    titleColor: '#f0f4ff',
                    bodyColor: '#94a3b8',
                    borderColor: '#1e2d4a',
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 10,
                    displayColors: false,
                    callbacks: {
                        label: (ctx) => `${ctx.parsed.y} vehículos`
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(30, 45, 74, 0.3)', drawBorder: false },
                    ticks: { color: '#64748b', font: { size: 10 } },
                    border: { display: false }
                },
                y: {
                    min: 0,
                    max: 30,
                    grid: { color: 'rgba(30, 45, 74, 0.3)', drawBorder: false },
                    ticks: {
                        color: '#64748b',
                        font: { size: 10 },
                        stepSize: 10,
                    },
                    border: { display: false }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index',
            }
        }
    });
}

// ============================================
// LAST ENTRIES TABLE
// ============================================

function updateLastEntries(movimientos) {
    const tbody = document.getElementById('lastEntriesBody');
    if (!tbody) return;

    const rows = movimientos.slice(0, 5).map(m => {
        const isEntry = m.tipo === 'Entrada';
        const typeClass = isEntry ? 'type-icon--entry' : 'type-icon--exit';
        const typeIcon = isEntry ? 'fa-arrow-down' : 'fa-arrow-up';
        const badgeClass = m.estado === 'Dentro' ? 'badge--inside' : 'badge--outside';

        return `
            <tr>
                <td class="patente-cell">${m.patente}</td>
                <td>${m.fecha}</td>
                <td>${m.hora}</td>
                <td>
                    <span class="type-icon ${typeClass}">
                        <i class="fas ${typeIcon}"></i> ${m.tipo}
                    </span>
                </td>
                <td><span class="badge ${badgeClass}">${m.estado}</span></td>
            </tr>
        `;
    }).join('');

    tbody.innerHTML = rows;

    // Animate rows in
    const tRows = tbody.querySelectorAll('tr');
    tRows.forEach((row, i) => {
        row.style.opacity = '0';
        row.style.transform = 'translateX(-10px)';
        row.style.transition = `all 0.3s ease ${i * 0.05}s`;
        requestAnimationFrame(() => {
            row.style.opacity = '1';
            row.style.transform = 'translateX(0)';
        });
    });
}

// ============================================
// TOP VEHICLES TABLE
// ============================================

function updateTopVehicles(topVehicles) {
    const tbody = document.getElementById('topVehiclesBody');
    if (!tbody) return;

    const rows = topVehicles.map((v, i) => `
        <tr>
            <td style="font-weight: 700; color: ${i < 3 ? '#f59e0b' : 'inherit'}">${i + 1}</td>
            <td class="patente-cell">${v.patente}</td>
            <td style="font-weight: 600">${v.ingresos}</td>
        </tr>
    `).join('');

    tbody.innerHTML = rows;
}

// ============================================
// DEBTORS TABLE
// ============================================

function updateDebtors(debtors) {
    const tbody = document.getElementById('debtorsBody');
    if (!tbody) return;

    const rows = debtors.map(d => `
        <tr>
            <td class="patente-cell">${d.patente}</td>
            <td class="debt-cell">$ ${formatNumber(d.deuda)}</td>
            <td>${d.ultimo_ingreso}</td>
        </tr>
    `).join('');

    tbody.innerHTML = rows;
}

// ============================================
// FOOTER STATS
// ============================================

function updateFooterStats(stats) {
    document.getElementById('footerIngresosVal').textContent = stats.ingresos_hoy;
    document.getElementById('footerRecaudacionVal').textContent = `$ ${formatNumber(stats.recaudacion_hoy)}`;
    document.getElementById('footerIngresosMesVal').textContent = formatNumber(stats.ingresos_mes);
    document.getElementById('footerPromedioVal').textContent = stats.promedio_diario;
    document.getElementById('footerPicoVal').textContent = stats.hora_pico;
}

// ============================================
// CONNECTION STATUS INDICATOR
// ============================================

function showConnectionStatus(type, message) {
    let statusEl = document.querySelector('.connection-status');

    if (!statusEl) {
        statusEl = document.createElement('div');
        statusEl.className = 'connection-status';
        document.body.appendChild(statusEl);
    }

    const icons = {
        'connected': '<i class="fas fa-check-circle"></i>',
        'disconnected': '<i class="fas fa-exclamation-circle"></i>',
        'loading': '<i class="fas fa-spinner fa-spin"></i>',
    };

    statusEl.className = `connection-status connection-status--${type}`;
    statusEl.innerHTML = `${icons[type] || ''} ${message}`;

    // Auto-hide after 5 seconds if connected
    if (type === 'connected') {
        setTimeout(() => {
            statusEl.style.opacity = '0';
            setTimeout(() => statusEl.remove(), 300);
        }, 4000);
    }
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================

function showToast(type, message) {
    // Remove existing toasts
    document.querySelectorAll('.toast').forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;

    const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
    toast.innerHTML = `<i class="fas ${icon}"></i> ${message}`;

    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function animateValue(elementId, endValue) {
    const el = document.getElementById(elementId);
    if (!el) return;

    const startValue = parseInt(el.textContent) || 0;
    if (startValue === endValue) {
        el.textContent = endValue;
        return;
    }

    const duration = 800;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease out
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(startValue + (endValue - startValue) * eased);

        el.textContent = current;

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}
