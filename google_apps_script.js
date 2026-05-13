/**
 * ============================================
 * GOOGLE APPS SCRIPT - ParkControl v2
 * ============================================
 * 
 * TODA la lógica de negocio corre ACA (server-side).
 * El frontend solo hace GET con parámetros de acción.
 * Esto evita problemas de CORS.
 * 
 * ACCIONES disponibles via URL:
 *   ?action=dashboard              → Datos completos del dashboard
 *   ?action=abrir_barrera&patente=XX&operador=YY  → Registrar Entrada/Salida
 *   ?action=cobrar_deuda&patente=XX              → Cobrar deuda pendiente
 *   ?action=consultar_vehiculo&patente=XX        → Info de un vehículo
 * 
 * INSTALACIÓN:
 *   1. Abrir Google Sheet → Extensiones → Apps Script
 *   2. Borrar Code.gs y pegar este código
 *   3. Implementar → Implementación nueva → App web
 *      - Ejecutar como: Yo
 *      - Acceso: Cualquier persona
 *   4. Copiar URL y pegar en data.js → SHEET_URL
 * 
 * ============================================
 */

// ============================================
// ROUTER PRINCIPAL
// ============================================

function doGet(e) {
    try {
        const action = (e && e.parameter && e.parameter.action) || 'dashboard';

        let result;

        switch (action) {
            case 'dashboard':
                result = getDashboardData();
                break;
            case 'abrir_barrera':
                result = abrirBarrera(e.parameter);
                break;
            case 'cobrar_deuda':
                result = cobrarDeuda(e.parameter);
                break;
            case 'consultar_vehiculo':
                result = consultarVehiculo(e.parameter);
                break;
            default:
                result = { error: 'Acción no reconocida: ' + action };
        }

        return ContentService
            .createTextOutput(JSON.stringify(result))
            .setMimeType(ContentService.MimeType.JSON);

    } catch (error) {
        return ContentService
            .createTextOutput(JSON.stringify({ error: error.message, stack: error.stack }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

// ============================================
// ACTION: DASHBOARD DATA
// ============================================

function getDashboardData() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Leer hojas
    const config = leerConfiguracion(ss);
    const vehiculos = leerHoja(ss, 'Vehiculos');
    const movimientos = leerHoja(ss, 'Movimientos');
    const estadisticas = leerHoja(ss, 'Estadisticas');

    // Capacidad
    const capacidadTotal = parseInt(config.capacidad_total) || 30;
    const tarifaHora = parseFloat(config.tarifa_hora) || 500;

    // Vehículos actualmente dentro
    const vehiculosDentro = calcularVehiculosDentro(movimientos);
    const ocupados = vehiculosDentro.length;
    const libres = Math.max(capacidadTotal - ocupados, 0);
    const porcentajeOcupado = Math.round((ocupados / capacidadTotal) * 100);

    // Estadísticas de hoy
    const hoyStr = fechaHoy();
    const movHoy = movimientos.filter(m => m.fecha === hoyStr);
    const ingresosHoy = movHoy.filter(m => m.tipo === 'Entrada').length;
    const recaudacionHoy = movHoy.reduce((sum, m) => sum + (parseFloat(m.monto) || 0), 0);

    // Últimos 10 movimientos
    const ultimosMovimientos = movimientos
        .sort((a, b) => compararFechaHora(b, a))
        .slice(0, 10)
        .map(m => ({
            patente: m.patente,
            fecha: formatearFecha(m.fecha),
            hora: m.hora,
            tipo: m.tipo,
            monto: parseFloat(m.monto) || 0,
            estado: vehiculosDentro.includes(m.patente) ? 'Dentro' : 'Fuera'
        }));

    // Top vehículos
    const topVehiculos = calcularTopVehiculos(movimientos);

    // Deudores
    const deudores = vehiculos
        .filter(v => parseFloat(v.deuda) > 0)
        .sort((a, b) => parseFloat(b.deuda) - parseFloat(a.deuda))
        .map(v => ({
            patente: v.patente,
            deuda: parseFloat(v.deuda),
            ultimo_ingreso: obtenerUltimoIngreso(v.patente, movimientos)
        }));

    // Estadísticas desde hoja
    const statsHoy = estadisticas.find(s => s.fecha === hoyStr) || {};

    // Ocupación 24h
    const ocupacion24h = calcularOcupacion24h(movimientos, capacidadTotal);

    return {
        configuracion: config,
        resumen: {
            total: capacidadTotal,
            ocupados: ocupados,
            libres: libres,
            porcentaje_ocupado: porcentajeOcupado,
            porcentaje_libre: 100 - porcentajeOcupado,
            recaudacion_hoy: recaudacionHoy,
        },
        movimientos: ultimosMovimientos,
        top_vehiculos: topVehiculos,
        deudores: deudores,
        estadisticas: {
            ingresos_hoy: ingresosHoy,
            recaudacion_hoy: recaudacionHoy,
            ingresos_mes: parseInt(statsHoy.ingresos_mes) || ingresosHoy,
            promedio_diario: parseInt(statsHoy.promedio_diario) || ingresosHoy,
            hora_pico: (statsHoy.hora_pico_inicio || '17:00') + ' - ' + (statsHoy.hora_pico_fin || '19:00'),
        },
        ocupacion_24h: ocupacion24h,
        vehiculos: vehiculos,
        vehiculos_dentro: vehiculosDentro,
    };
}

// ============================================
// ACTION: ABRIR BARRERA
// ============================================
// Lógica:
// - Si el vehículo está FUERA → registra ENTRADA (monto = 0)
// - Si el vehículo está DENTRO → registra SALIDA + calcula monto por tiempo
// - Si el vehículo tiene deuda → la suma al monto
// - Si el vehículo no existe → lo registra automáticamente

function abrirBarrera(params) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const patente = (params.patente || '').toUpperCase().replace(/\s/g, '');
    const operador = params.operador || 'Sistema';

    if (!patente) {
        return { success: false, message: 'Patente no especificada' };
    }

    const config = leerConfiguracion(ss);
    const tarifaHora = parseFloat(config.tarifa_hora) || 500;
    const tarifaFraccion = parseFloat(config.tarifa_fraccion) || 250;
    const tarifaDia = parseFloat(config.tarifa_dia) || 3500;

    // Leer movimientos para saber si está dentro
    const movimientos = leerHoja(ss, 'Movimientos');
    const vehiculosDentro = calcularVehiculosDentro(movimientos);
    const estaDentro = vehiculosDentro.includes(patente);

    // Verificar si el vehículo existe
    const vehiculosSheet = ss.getSheetByName('Vehiculos');
    const vehiculos = leerHoja(ss, 'Vehiculos');
    const vehiculo = vehiculos.find(v => v.patente === patente);

    // Si no existe, registrarlo automáticamente
    if (!vehiculo && vehiculosSheet) {
        vehiculosSheet.appendRow([patente, 'Sin identificar', 'Auto', 'SI', 'NO', 0, '', '', fechaHoy()]);
    }

    // Verificar si es abonado (no cobra)
    const esAbonado = vehiculo && vehiculo.abonado === 'SI';

    const now = new Date();
    const fecha = fechaHoy();
    const hora = Utilities.formatDate(now, Session.getScriptTimeZone(), 'HH:mm:ss');

    const movSheet = ss.getSheetByName('Movimientos');

    if (!estaDentro) {
        // ======== ENTRADA ========
        movSheet.appendRow([patente, fecha, hora, 'Entrada', 0, operador, '']);

        return {
            success: true,
            tipo: 'Entrada',
            patente: patente,
            message: `✅ ENTRADA registrada: ${patente}`,
            hora: hora,
            monto: 0,
            esAbonado: esAbonado,
            deuda: parseFloat(vehiculo?.deuda || 0),
        };

    } else {
        // ======== SALIDA ========
        // Buscar hora de entrada para calcular monto
        const entrada = movimientos
            .filter(m => m.patente === patente && m.tipo === 'Entrada')
            .sort((a, b) => compararFechaHora(b, a))[0];

        let monto = 0;
        let tiempoMinutos = 0;
        let tiempoTexto = '';

        if (entrada && !esAbonado) {
            const fechaEntrada = new Date(entrada.fecha + 'T' + entrada.hora);
            const diffMs = now.getTime() - fechaEntrada.getTime();
            tiempoMinutos = Math.ceil(diffMs / 60000);

            const horas = Math.floor(tiempoMinutos / 60);
            const mins = tiempoMinutos % 60;
            tiempoTexto = horas > 0 ? `${horas}h ${mins}m` : `${mins}m`;

            // Cálculo de tarifa
            if (tiempoMinutos <= 30) {
                monto = tarifaFraccion;
            } else {
                const horasFacturadas = Math.ceil(tiempoMinutos / 60);
                monto = horasFacturadas * tarifaHora;
            }

            // Tope diario
            monto = Math.min(monto, tarifaDia);
        }

        // Registrar salida
        movSheet.appendRow([patente, fecha, hora, 'Salida', monto, operador, `Tiempo: ${tiempoTexto}`]);

        // Si tiene deuda previa, sumarla
        const deudaPrevia = parseFloat(vehiculo?.deuda || 0);

        return {
            success: true,
            tipo: 'Salida',
            patente: patente,
            message: `✅ SALIDA registrada: ${patente} — ${esAbonado ? 'ABONADO (sin cargo)' : '$' + monto}`,
            hora: hora,
            monto: monto,
            tiempoMinutos: tiempoMinutos,
            tiempoTexto: tiempoTexto,
            esAbonado: esAbonado,
            deuda: deudaPrevia,
            tarifaAplicada: esAbonado ? 'Abonado' : (tiempoMinutos <= 30 ? 'Fracción' : 'Por hora'),
        };
    }
}

// ============================================
// ACTION: COBRAR DEUDA
// ============================================

function cobrarDeuda(params) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const patente = (params.patente || '').toUpperCase().replace(/\s/g, '');

    if (!patente) {
        return { success: false, message: 'Patente no especificada' };
    }

    const sheet = ss.getSheetByName('Vehiculos');
    const valores = sheet.getDataRange().getValues();
    const headers = valores[0].map(h => h.toString().toLowerCase().replace(/\s+/g, '_'));
    const colPatente = headers.indexOf('patente');
    const colDeuda = headers.indexOf('deuda');

    if (colPatente === -1 || colDeuda === -1) {
        return { success: false, message: 'Columnas no encontradas' };
    }

    for (let i = 1; i < valores.length; i++) {
        if (valores[i][colPatente].toString().toUpperCase() === patente) {
            const deudaAnterior = parseFloat(valores[i][colDeuda]) || 0;
            sheet.getRange(i + 1, colDeuda + 1).setValue(0);
            return {
                success: true,
                message: `Deuda de $${deudaAnterior} cobrada para ${patente}`,
                deudaAnterior: deudaAnterior,
            };
        }
    }

    return { success: false, message: `Vehículo ${patente} no encontrado` };
}

// ============================================
// ACTION: CONSULTAR VEHÍCULO
// ============================================

function consultarVehiculo(params) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const patente = (params.patente || '').toUpperCase().replace(/\s/g, '');

    const vehiculos = leerHoja(ss, 'Vehiculos');
    const vehiculo = vehiculos.find(v => v.patente === patente);

    if (!vehiculo) {
        return { encontrado: false, patente: patente, message: 'Vehículo no registrado' };
    }

    const movimientos = leerHoja(ss, 'Movimientos');
    const vehiculosDentro = calcularVehiculosDentro(movimientos);

    return {
        encontrado: true,
        patente: vehiculo.patente,
        titular: vehiculo.titular,
        tipo: vehiculo.tipo,
        habilitado: vehiculo.habilitado === 'SI',
        abonado: vehiculo.abonado === 'SI',
        deuda: parseFloat(vehiculo.deuda) || 0,
        estaDentro: vehiculosDentro.includes(patente),
    };
}

// ============================================
// HELPER: LEER HOJAS
// ============================================

function leerHoja(ss, nombre) {
    const sheet = ss.getSheetByName(nombre);
    if (!sheet) return [];
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return [];

    const headers = data[0].map(h => h.toString().toLowerCase().replace(/\s+/g, '_'));
    return data.slice(1).map(row => {
        const obj = {};
        headers.forEach((h, i) => {
            let val = row[i];
            // Convertir fechas de Date object a string
            if (val instanceof Date) {
                val = Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
            }
            obj[h] = val !== undefined && val !== null ? val.toString() : '';
        });
        return obj;
    });
}

function leerConfiguracion(ss) {
    const sheet = ss.getSheetByName('Configuracion');
    if (!sheet) return {};
    const data = sheet.getDataRange().getValues();
    const obj = {};
    data.forEach(row => {
        if (row[0]) obj[row[0].toString().toLowerCase().replace(/\s+/g, '_')] = row[1];
    });
    return obj;
}

// ============================================
// HELPER: CÁLCULOS
// ============================================

function calcularVehiculosDentro(movimientos) {
    const estado = {};

    [...movimientos]
        .sort((a, b) => compararFechaHora(a, b))
        .forEach(m => {
            if (m.tipo === 'Entrada') {
                estado[m.patente] = true;
            } else if (m.tipo === 'Salida') {
                delete estado[m.patente];
            }
        });

    return Object.keys(estado);
}

function calcularTopVehiculos(movimientos) {
    const conteo = {};
    movimientos
        .filter(m => m.tipo === 'Entrada')
        .forEach(m => {
            conteo[m.patente] = (conteo[m.patente] || 0) + 1;
        });

    return Object.entries(conteo)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([patente, ingresos]) => ({ patente, ingresos }));
}

function obtenerUltimoIngreso(patente, movimientos) {
    const entradas = movimientos
        .filter(m => m.patente === patente && m.tipo === 'Entrada')
        .sort((a, b) => compararFechaHora(b, a));

    return entradas.length > 0 ? formatearFecha(entradas[0].fecha) : 'N/A';
}

function calcularOcupacion24h(movimientos, capacidad) {
    const labels = [];
    const data = [];
    const now = new Date();

    for (let i = 12; i >= 0; i--) {
        const hora = new Date(now.getTime() - i * 2 * 3600000);
        labels.push(Utilities.formatDate(hora, Session.getScriptTimeZone(), 'HH:mm'));

        const count = movimientos.filter(m => {
            try {
                const mDate = new Date(m.fecha + 'T' + m.hora);
                return mDate <= hora && m.tipo === 'Entrada';
            } catch (e) { return false; }
        }).length;

        data.push(Math.min(count, capacidad));
    }

    return { labels, data };
}

// ============================================
// HELPER: UTILIDADES
// ============================================

function fechaHoy() {
    return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function formatearFecha(fechaISO) {
    if (!fechaISO) return '';
    const parts = fechaISO.split('-');
    if (parts.length !== 3) return fechaISO;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function compararFechaHora(a, b) {
    try {
        const dateA = new Date(a.fecha + 'T' + a.hora);
        const dateB = new Date(b.fecha + 'T' + b.hora);
        return dateA - dateB;
    } catch (e) {
        return 0;
    }
}
