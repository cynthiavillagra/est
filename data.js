/* ============================================
   DATA.JS - Data Layer & Google Sheets Integration
   ============================================
   
   API via GET (evita CORS):
   ?action=dashboard                          → Datos completos
   ?action=abrir_barrera&patente=XX&operador=YY → Entrada/Salida
   ?action=cobrar_deuda&patente=XX            → Cobra deuda
   ?action=consultar_vehiculo&patente=XX      → Info de vehículo
   
   ============================================ */

// ============================================
// GOOGLE SHEETS CONFIGURATION
// ============================================

const SHEETS_CONFIG = {
    // ✅ CONECTADO A GOOGLE SHEETS
    // Si falla la conexión, cae automáticamente a MOCK_DATA como fallback
    // Backup de datos mock en: data_mock_backup.js

    USAR_SHEETS: true,
    SHEET_URL: 'https://script.google.com/macros/s/AKfycbzsQxLNBJjwcomD5zWmfkIKT8ElwY9eJ6_jMGhXB5FoJBWuP0XLRm01G55lZymZfNW_7Q/exec',
    REFRESH_INTERVAL: 30000, // Refrescar cada 30 segundos
};

// ============================================
// MOCK DATA (Datos provisorios / fallback)
// ============================================

const MOCK_DATA = {
    configuracion: {
        capacidad_total: 30,
        tarifa_hora: 500,
        tarifa_fraccion: 250,
        nombre_parking: 'ParkControl Central',
        direccion: 'Av. Corrientes 1234, CABA'
    },

    vehiculos: [
        { patente: 'AA123BB', titular: 'Juan Pérez', tipo: 'Auto', habilitado: true, abonado: true, deuda: 0 },
        { patente: 'AC456DF', titular: 'María García', tipo: 'Auto', habilitado: true, abonado: false, deuda: 3500 },
        { patente: 'AD789GH', titular: 'Carlos López', tipo: 'Camioneta', habilitado: true, abonado: true, deuda: 0 },
        { patente: 'AE101IJ', titular: 'Ana Rodríguez', tipo: 'Moto', habilitado: true, abonado: false, deuda: 0 },
        { patente: 'AF202KL', titular: 'Pablo Díaz', tipo: 'Auto', habilitado: true, abonado: true, deuda: 0 },
        { patente: 'AD111EF', titular: 'Roberto Sánchez', tipo: 'Auto', habilitado: true, abonado: false, deuda: 2000 },
        { patente: 'AG222HH', titular: 'Laura Fernández', tipo: 'Auto', habilitado: true, abonado: false, deuda: 1500 },
        { patente: 'AI333JJ', titular: 'Diego Morales', tipo: 'Auto', habilitado: true, abonado: false, deuda: 1000 },
    ],

    movimientos: [
        { patente: 'AA123BB', fecha: '08/05/2026', hora: '10:42:28', tipo: 'Entrada', estado: 'Dentro', monto: 0 },
        { patente: 'AC456DF', fecha: '08/05/2026', hora: '10:35:14', tipo: 'Entrada', estado: 'Dentro', monto: 0 },
        { patente: 'AD789GH', fecha: '08/05/2026', hora: '10:28:05', tipo: 'Entrada', estado: 'Dentro', monto: 0 },
        { patente: 'AE101IJ', fecha: '08/05/2026', hora: '10:20:11', tipo: 'Salida', estado: 'Fuera', monto: 750 },
        { patente: 'AF202KL', fecha: '08/05/2026', hora: '10:15:47', tipo: 'Entrada', estado: 'Dentro', monto: 0 },
    ],

    vehiculos_dentro: ['AA123BB', 'AC456DF', 'AD789GH', 'AF202KL', 'AM555NN', 'AD111EF', 'AG222HH', 'AI333JJ',
        'AB100CC', 'AB200DD', 'AB300EE', 'AB400FF', 'AB500GG', 'AB600HH', 'AB700II', 'AB800JJ',
        'AB900KK', 'AC100LL'
    ],

    top_vehiculos: [
        { patente: 'AA123BB', ingresos: 35 },
        { patente: 'AC456DF', ingresos: 28 },
        { patente: 'AD789GH', ingresos: 23 },
        { patente: 'AE101IJ', ingresos: 21 },
        { patente: 'AF202KL', ingresos: 19 },
    ],

    estadisticas_hoy: {
        ingresos_hoy: 87,
        recaudacion_hoy: 48750,
        ingresos_mes: 1245,
        promedio_diario: 62,
        hora_pico: '17:00 - 19:00',
    },

    ocupacion_24h: {
        labels: ['10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00', '00:00', '02:00', '04:00', '06:00', '08:00', '10:00'],
        data: [12, 18, 22, 25, 28, 24, 20, 10, 5, 3, 2, 8, 15],
    },

    deudores: [
        { patente: 'AC456DF', deuda: 3500, ultimo_ingreso: '05/05/2026' },
        { patente: 'AD111EF', deuda: 2000, ultimo_ingreso: '02/05/2026' },
        { patente: 'AG222HH', deuda: 1500, ultimo_ingreso: '03/05/2026' },
        { patente: 'AI333JJ', deuda: 1000, ultimo_ingreso: '01/05/2026' },
    ],
};

// ============================================
// DATA SERVICE
// ============================================

class DataService {
    constructor() {
        this.useSheets = SHEETS_CONFIG.USAR_SHEETS;
        this.sheetUrl = SHEETS_CONFIG.SHEET_URL;
        this.cache = {};
        this.lastFetch = null;
    }

    /**
     * Obtener todos los datos del dashboard
     */
    async fetchAllData() {
        if (this.useSheets && this.sheetUrl) {
            return await this._callSheets('dashboard');
        }
        return this._getMockData();
    }

    /**
     * Llamar al Apps Script via GET (evita CORS)
     * Todas las acciones van como ?action=xxx&param1=val1&...
     */
    async _callSheets(action, params = {}) {
        try {
            const url = new URL(this.sheetUrl);
            url.searchParams.set('action', action);
            Object.entries(params).forEach(([key, val]) => {
                url.searchParams.set(key, val);
            });

            const response = await fetch(url.toString());
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();

            if (action === 'dashboard') {
                this.cache = data;
                this.lastFetch = new Date();
            }

            return data;
        } catch (error) {
            console.error(`Error en _callSheets(${action}):`, error);

            if (action === 'dashboard') {
                if (Object.keys(this.cache).length > 0) {
                    console.warn('Usando datos cacheados');
                    return this.cache;
                }
                console.warn('Usando datos mock como fallback');
                return this._getMockData();
            }

            return { success: false, message: 'Error de conexión: ' + error.message };
        }
    }

    /**
     * ABRIR BARRERA - El servidor decide Entrada/Salida y calcula monto
     */
    async abrirBarrera(patente, operador = 'Sistema') {
        if (!this.useSheets || !this.sheetUrl) {
            return { success: true, message: 'Simulado (modo mock)', tipo: 'Entrada', simulated: true };
        }
        return await this._callSheets('abrir_barrera', { patente, operador });
    }

    /**
     * COBRAR DEUDA
     */
    async cobrarDeuda(patente) {
        if (!this.useSheets || !this.sheetUrl) {
            return { success: true, message: 'Deuda cobrada (simulado)', simulated: true };
        }
        return await this._callSheets('cobrar_deuda', { patente });
    }

    /**
     * Buscar vehículo en cache/mock
     */
    buscarVehiculo(patente) {
        const p = patente.replace(/\s/g, '').toUpperCase();
        if (this.cache && this.cache.vehiculos) {
            return this.cache.vehiculos.find(v => v.patente === p) || null;
        }
        return MOCK_DATA.vehiculos.find(v => v.patente === p) || null;
    }

    /**
     * Verificar si un vehículo está dentro
     */
    estaDentro(patente) {
        const p = patente.replace(/\s/g, '').toUpperCase();
        if (this.cache && this.cache.vehiculos_dentro) {
            return this.cache.vehiculos_dentro.includes(p);
        }
        return MOCK_DATA.vehiculos_dentro.includes(p);
    }

    /**
     * Datos mock como fallback
     */
    _getMockData() {
        const totalPlaces = MOCK_DATA.configuracion.capacidad_total;
        const occupied = MOCK_DATA.vehiculos_dentro.length;
        const free = totalPlaces - occupied;
        const occupiedPercent = Math.round((occupied / totalPlaces) * 100);

        return {
            configuracion: MOCK_DATA.configuracion,
            resumen: {
                total: totalPlaces, ocupados: occupied, libres: free,
                porcentaje_ocupado: occupiedPercent,
                porcentaje_libre: 100 - occupiedPercent,
                recaudacion_hoy: MOCK_DATA.estadisticas_hoy.recaudacion_hoy,
            },
            movimientos: MOCK_DATA.movimientos,
            top_vehiculos: MOCK_DATA.top_vehiculos,
            deudores: MOCK_DATA.deudores,
            estadisticas: MOCK_DATA.estadisticas_hoy,
            ocupacion_24h: MOCK_DATA.ocupacion_24h,
            vehiculos: MOCK_DATA.vehiculos,
            vehiculos_dentro: MOCK_DATA.vehiculos_dentro,
        };
    }
}

// Export global instance
const dataService = new DataService();
