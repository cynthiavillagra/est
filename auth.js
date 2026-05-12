/* ============================================
   AUTH.JS - Authentication & Authorization
   ============================================
   
   ROLES Y PERMISOS:
   
   admin     → Acceso total: dashboard, barrera, historial, reportes, 
                abonados, deudas, configuración, gestión de usuarios
   
   operador  → Operaciones: dashboard, barrera, historial, vehículos
                NO puede: configuración, gestión de usuarios, reportes avanzados
   
   visor     → Solo lectura: ver dashboard, estadísticas
                NO puede: abrir barrera, cobrar deudas, gestionar nada
   
   ESTRUCTURA EXCEL/SHEET - Hoja "Usuarios":
   | usuario   | password  | nombre          | rol       | activo |
   |-----------|-----------|-----------------|-----------|--------|
   | admin     | admin123  | Administrador   | admin     | SI     |
   | operador  | oper123   | Juan Operador   | operador  | SI     |
   | visor     | visor123  | María Consulta  | visor     | SI     |
   
   ============================================ */

// ============================================
// PERMISSIONS MAP
// ============================================

const PERMISOS = {
    admin: {
        label: 'Administrador',
        color: '#ef4444',
        permisos: [
            'ver_dashboard',
            'ver_estadisticas',
            'abrir_barrera',
            'ver_historial',
            'ver_vehiculos',
            'gestionar_vehiculos',
            'ver_deudas',
            'cobrar_deudas',
            'ver_reportes',
            'ver_abonados',
            'gestionar_abonados',
            'ver_configuracion',
            'editar_configuracion',
            'gestionar_usuarios',
        ]
    },
    operador: {
        label: 'Operador',
        color: '#3b82f6',
        permisos: [
            'ver_dashboard',
            'ver_estadisticas',
            'abrir_barrera',
            'ver_historial',
            'ver_vehiculos',
            'ver_deudas',
            'ver_abonados',
        ]
    },
    visor: {
        label: 'Visor',
        color: '#22c55e',
        permisos: [
            'ver_dashboard',
            'ver_estadisticas',
        ]
    }
};

// ============================================
// MOCK USERS (will be replaced by Excel/DB)
// ============================================

const USUARIOS_MOCK = [
    { usuario: 'admin', password: 'admin123', nombre: 'Administrador', rol: 'admin', activo: true },
    { usuario: 'operador', password: 'oper123', nombre: 'Juan Operador', rol: 'operador', activo: true },
    { usuario: 'visor', password: 'visor123', nombre: 'María Consulta', rol: 'visor', activo: true },
    { usuario: 'carlos', password: 'carlos123', nombre: 'Carlos López', rol: 'operador', activo: true },
    { usuario: 'ana', password: 'ana123', nombre: 'Ana Rodríguez', rol: 'visor', activo: false },
];

// ============================================
// AUTH SERVICE
// ============================================

const AuthService = {
    SESSION_KEY: 'parkcontrol_session',

    /**
     * Intentar login
     * @returns {{ success: boolean, message: string, user?: object }}
     */
    login(usuario, password, remember = false) {
        const user = USUARIOS_MOCK.find(
            u => u.usuario.toLowerCase() === usuario.toLowerCase() && u.password === password
        );

        if (!user) {
            return { success: false, message: 'Usuario o contraseña incorrectos' };
        }

        if (!user.activo) {
            return { success: false, message: 'Esta cuenta está desactivada. Contactá al administrador.' };
        }

        // Build session
        const session = {
            usuario: user.usuario,
            nombre: user.nombre,
            rol: user.rol,
            permisos: PERMISOS[user.rol]?.permisos || [],
            rolLabel: PERMISOS[user.rol]?.label || user.rol,
            rolColor: PERMISOS[user.rol]?.color || '#94a3b8',
            loginTime: new Date().toISOString(),
        };

        // Store session
        const storage = remember ? localStorage : sessionStorage;
        storage.setItem(this.SESSION_KEY, JSON.stringify(session));

        // Also keep in localStorage if remember is checked
        if (remember) {
            sessionStorage.removeItem(this.SESSION_KEY);
        } else {
            localStorage.removeItem(this.SESSION_KEY);
        }

        return { success: true, message: 'Login exitoso', user: session };
    },

    /**
     * Cerrar sesión
     */
    logout() {
        localStorage.removeItem(this.SESSION_KEY);
        sessionStorage.removeItem(this.SESSION_KEY);
        window.location.href = 'login.html';
    },

    /**
     * Verificar si hay sesión activa
     */
    isLoggedIn() {
        return this.getSession() !== null;
    },

    /**
     * Obtener datos de sesión actual
     */
    getSession() {
        const data = sessionStorage.getItem(this.SESSION_KEY) || localStorage.getItem(this.SESSION_KEY);
        if (!data) return null;

        try {
            return JSON.parse(data);
        } catch {
            return null;
        }
    },

    /**
     * Verificar si el usuario actual tiene un permiso
     */
    hasPermission(permiso) {
        const session = this.getSession();
        if (!session) return false;
        return session.permisos.includes(permiso);
    },

    /**
     * Verificar si el usuario tiene rol admin
     */
    isAdmin() {
        const session = this.getSession();
        return session?.rol === 'admin';
    },

    /**
     * Obtener rol actual
     */
    getRole() {
        const session = this.getSession();
        return session?.rol || null;
    },

    /**
     * Obtener nombre del usuario actual
     */
    getUserName() {
        const session = this.getSession();
        return session?.nombre || 'Usuario';
    },

    /**
     * Obtener label y color del rol
     */
    getRoleInfo() {
        const session = this.getSession();
        if (!session) return { label: 'Desconocido', color: '#94a3b8' };
        return { label: session.rolLabel, color: session.rolColor };
    },

    /**
     * Require login - redirect if not authenticated
     * Call this at the top of protected pages
     */
    requireAuth() {
        if (!this.isLoggedIn()) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    },

    /**
     * Apply permission-based UI visibility
     * Elements with data-permission="permiso_name" will be shown/hidden
     * Elements with data-role="admin,operador" will be shown only for those roles
     */
    applyPermissions() {
        const session = this.getSession();
        if (!session) return;

        // Handle data-permission attributes
        document.querySelectorAll('[data-permission]').forEach(el => {
            const requiredPermission = el.getAttribute('data-permission');
            if (!session.permisos.includes(requiredPermission)) {
                el.classList.add('permission-hidden');
                // Disable interactive elements
                if (el.tagName === 'BUTTON' || el.tagName === 'A' || el.tagName === 'INPUT') {
                    el.disabled = true;
                    el.style.pointerEvents = 'none';
                }
            } else {
                el.classList.remove('permission-hidden');
            }
        });

        // Handle data-role attributes
        document.querySelectorAll('[data-role]').forEach(el => {
            const allowedRoles = el.getAttribute('data-role').split(',').map(r => r.trim());
            if (!allowedRoles.includes(session.rol)) {
                el.classList.add('permission-hidden');
            } else {
                el.classList.remove('permission-hidden');
            }
        });

        // Handle data-hide-role (inverse - hide for specific roles)
        document.querySelectorAll('[data-hide-role]').forEach(el => {
            const hiddenRoles = el.getAttribute('data-hide-role').split(',').map(r => r.trim());
            if (hiddenRoles.includes(session.rol)) {
                el.classList.add('permission-hidden');
            }
        });
    }
};
