/* ============================================
   DATA.JS - Data Layer & Google Sheets Integration
   ============================================
   
   ESTRUCTURA DE GOOGLE SHEETS REQUERIDA:
   
   Sheet 1: "Configuracion"
   | campo            | valor |
   |------------------|-------|
   | capacidad_total  | 30    |
   | tarifa_hora      | 500   |
   | tarifa_fraccion   | 250   |
   | nombre_parking   | ParkControl Central |
   | direccion        | Av. Corrientes 1234 |
   
   Sheet 2: "Vehiculos"
   | patente  | titular         | tipo     | habilitado | abonado | deuda  |
   |----------|-----------------|----------|------------|---------|--------|
   | AA123BB  | Juan Pérez      | Auto     | SI         | SI      | 0      |
   | AC456DF  | María García    | Auto     | SI         | NO      | 3500   |
   | AD789GH  | Carlos López    | Camioneta| SI         | SI      | 0      |
   | AE101IJ  | Ana Rodríguez   | Moto     | SI         | NO      | 0      |
   | AF202KL  | Pablo Díaz      | Auto     | SI         | SI      | 0      |
   | AD111EF  | Roberto Sánchez | Auto     | SI         | NO      | 2000   |
   | AG222HH  | Laura Fernández | Auto     | SI         | NO      | 1500   |
   | AI333JJ  | Diego Morales   | Auto     | SI         | NO      | 1000   |
   
   Sheet 3: "Movimientos"
   | patente  | fecha      | hora     | tipo    | monto | operador      |
   |----------|------------|----------|---------|-------|---------------|
   | AA123BB  | 2026-05-08 | 10:42:28 | Entrada | 0     | Sistema       |
   | AC456DF  | 2026-05-08 | 10:35:14 | Entrada | 0     | Sistema       |
   | AD789GH  | 2026-05-08 | 10:28:05 | Entrada | 0     | Sistema       |
   | AE101IJ  | 2026-05-08 | 10:20:11 | Salida  | 750   | Sistema       |
   | AF202KL  | 2026-05-08 | 10:15:47 | Entrada | 0     | Sistema       |
   
   Sheet 4: "Estadisticas"
   | fecha      | ingresos_dia | recaudacion_dia | ocupacion_max | hora_pico_inicio | hora_pico_fin |
   |------------|--------------|-----------------|---------------|------------------|---------------|
   | 2026-05-08 | 87           | 48750           | 25            | 17:00            | 19:00         |
   | 2026-05-07 | 75           | 42000           | 22            | 17:00            | 19:00         |
   
   ============================================ */

// ============================================
// GOOGLE SHEETS CONFIGURATION
// ============================================

const SHEETS_CONFIG = {
    // ✅ CONECTADO A GOOGLE SHEETS
    // Si falla la conexión, cae automáticamente a MOCK_DATA como fallback
    // Backup de datos mock en: data_mock_backup.js

    USAR_SHEETS: true,
    SHEET_URL: 'https://script.google.com/macros/s/AKfycbzGr46CN_7-bCvpIca13QeWF8K6Eesa_BQYhk92AL_wal33TzrhpLU9VKPUJdgWj0EG8Q/exec',
    REFRESH_INTERVAL: 30000, // Refrescar cada 30 segundos
};

// ============================================
// MOCK DATA (Datos provisorios)
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
        { patente: 'AK444LL', titular: 'Sofía Martínez', tipo: 'Auto', habilitado: false, abonado: false, deuda: 5000 },
        { patente: 'AM555NN', titular: 'Lucas Romero', tipo: 'Auto', habilitado: true, abonado: true, deuda: 0 },
    ],

    movimientos: [
        { patente: 'AA123BB', fecha: '08/05/2026', hora: '10:42:28', tipo: 'Entrada', estado: 'Dentro', monto: 0 },
        { patente: 'AC456DF', fecha: '08/05/2026', hora: '10:35:14', tipo: 'Entrada', estado: 'Dentro', monto: 0 },
        { patente: 'AD789GH', fecha: '08/05/2026', hora: '10:28:05', tipo: 'Entrada', estado: 'Dentro', monto: 0 },
        { patente: 'AE101IJ', fecha: '08/05/2026', hora: '10:20:11', tipo: 'Salida', estado: 'Fuera', monto: 750 },
        { patente: 'AF202KL', fecha: '08/05/2026', hora: '10:15:47', tipo: 'Entrada', estado: 'Dentro', monto: 0 },
        { patente: 'AM555NN', fecha: '08/05/2026', hora: '10:10:33', tipo: 'Entrada', estado: 'Dentro', monto: 0 },
        { patente: 'AD111EF', fecha: '08/05/2026', hora: '10:05:19', tipo: 'Entrada', estado: 'Dentro', monto: 0 },
        { patente: 'AG222HH', fecha: '08/05/2026', hora: '09:58:42', tipo: 'Entrada', estado: 'Dentro', monto: 0 },
        { patente: 'AI333JJ', fecha: '08/05/2026', hora: '09:50:15', tipo: 'Entrada', estado: 'Dentro', monto: 0 },
    ],

    // Vehículos que están ACTUALMENTE dentro del estacionamiento
    vehiculos_dentro: ['AA123BB', 'AC456DF', 'AD789GH', 'AF202KL', 'AM555NN', 'AD111EF', 'AG222HH', 'AI333JJ',
        'AB100CC', 'AB200DD', 'AB300EE', 'AB400FF', 'AB500GG', 'AB600HH', 'AB700II', 'AB800JJ',
        'AB900KK', 'AC100LL'
    ],

    // Top vehículos por frecuencia de ingresos
    top_vehiculos: [
        { patente: 'AA123BB', ingresos: 35 },
        { patente: 'AC456DF', ingresos: 28 },
        { patente: 'AD789GH', ingresos: 23 },
        { patente: 'AE101IJ', ingresos: 21 },
        { patente: 'AF202KL', ingresos: 19 },
    ],

    // Estadísticas del día
    estadisticas_hoy: {
        ingresos_hoy: 87,
        recaudacion_hoy: 48750,
        ingresos_mes: 1245,
        promedio_diario: 62,
        hora_pico: '17:00 - 19:00',
    },

    // Datos para gráfico de ocupación 24h
    ocupacion_24h: {
        labels: ['10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00', '00:00', '02:00', '04:00', '06:00', '08:00', '10:00'],
        data: [12, 18, 22, 25, 28, 24, 20, 10, 5, 3, 2, 8, 15],
    },

    // Deudores 
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
     * Obtener todos los datos (ya sea de Sheets o mock)
     */
    async fetchAllData() {
        if (this.useSheets && this.sheetUrl) {
            return await this._fetchFromSheets();
        }
        return this._getMockData();
    }

    /**
     * Fetch data from Google Sheets via Apps Script Web App
     */
    async _fetchFromSheets() {
        try {
            const response = await fetch(this.sheetUrl);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            this.cache = data;
            this.lastFetch = new Date();
            return data;
        } catch (error) {
            console.error('Error fetching from Google Sheets:', error);
            // Fallback a cache o mock
            if (Object.keys(this.cache).length > 0) {
                console.warn('Using cached data');
                return this.cache;
            }
            console.warn('Using mock data as fallback');
            return this._getMockData();
        }
    }

    /**
     * Retornar datos mock procesados
     */
    _getMockData() {
        const totalPlaces = MOCK_DATA.configuracion.capacidad_total;
        const occupied = MOCK_DATA.vehiculos_dentro.length;
        const free = totalPlaces - occupied;
        const occupiedPercent = Math.round((occupied / totalPlaces) * 100);
        const freePercent = 100 - occupiedPercent;

        return {
            configuracion: MOCK_DATA.configuracion,
            resumen: {
                total: totalPlaces,
                ocupados: occupied,
                libres: free,
                porcentaje_ocupado: occupiedPercent,
                porcentaje_libre: freePercent,
                recaudacion_hoy: MOCK_DATA.estadisticas_hoy.recaudacion_hoy,
            },
            movimientos: MOCK_DATA.movimientos,
            top_vehiculos: MOCK_DATA.top_vehiculos,
            deudores: MOCK_DATA.deudores,
            estadisticas: MOCK_DATA.estadisticas_hoy,
            ocupacion_24h: MOCK_DATA.ocupacion_24h,
            vehiculos: MOCK_DATA.vehiculos,
        };
    }

    /**
     * Buscar vehículo por patente (usa cache o mock)
     */
    buscarVehiculo(patente) {
        const patenteNorm = patente.replace(/\s/g, '').toUpperCase();
        // Buscar en datos cacheados de Sheets primero
        if (this.cache && this.cache.vehiculos) {
            return this.cache.vehiculos.find(v => v.patente === patenteNorm) || null;
        }
        return MOCK_DATA.vehiculos.find(v => v.patente === patenteNorm) || null;
    }

    /**
     * Verificar si un vehículo está dentro (usa datos de Sheets si disponible)
     */
    estaDentro(patente) {
        const patenteNorm = patente.replace(/\s/g, '').toUpperCase();
        // Si tenemos movimientos del cache, calcular estado real
        if (this.cache && this.cache.movimientos) {
            const movs = this.cache.movimientos.filter(m => m.patente === patenteNorm);
            if (movs.length > 0) {
                return movs[0].estado === 'Dentro';
            }
        }
        return MOCK_DATA.vehiculos_dentro.includes(patenteNorm);
    }

    // ============================================
    // ESCRITURA - POST a Google Sheets
    // ============================================

    /**
     * Enviar datos al Sheet vía POST
     */
    async _postToSheets(action, data) {
        if (!this.useSheets || !this.sheetUrl) {
            console.warn('Sheets no configurado, operación simulada');
            return { success: true, message: 'Operación simulada (modo mock)', simulated: true };
        }

        try {
            const response = await fetch(this.sheetUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ action, data }),
            });

            // Apps Script redirects, so we follow it
            const result = await response.json();
            return result;
        } catch (error) {
            console.error(`Error en POST (${action}):`, error);
            return { success: false, message: 'Error de conexión: ' + error.message };
        }
    }

    /**
     * Registrar movimiento (Entrada o Salida)
     * @param {string} patente 
     * @param {string} tipo - 'Entrada' o 'Salida'
     * @param {number} monto - Monto cobrado (solo para Salida)
     * @param {string} operador - Nombre del operador
     */
    async registrarMovimiento(patente, tipo, monto = 0, operador = 'Sistema') {
        return await this._postToSheets('registrar_movimiento', {
            patente,
            tipo,
            monto,
            operador,
        });
    }

    /**
     * Actualizar deuda de un vehículo
     */
    async actualizarDeuda(patente, nuevaDeuda) {
        return await this._postToSheets('actualizar_deuda', {
            patente,
            deuda: nuevaDeuda,
        });
    }

    /**
     * Registrar un vehículo nuevo
     */
    async registrarVehiculo(data) {
        return await this._postToSheets('registrar_vehiculo', data);
    }
}

// Export global instance
const dataService = new DataService();

