/* ============================================
   DATA.JS - Conexión a Google Sheets
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
    // Datos mock respaldados en: data_mock_backup.js

    USAR_SHEETS: true,
    SHEET_URL: 'https://script.google.com/macros/s/AKfycbzxwC6Ia8uvY6V2MbamFGyF0Shh7asnTuK6hu2jZVrLVV0vOHC0mnBT4ky7TOqVWfHi/exec',
    REFRESH_INTERVAL: 30000, // Refrescar cada 30 segundos
};

// ============================================
// DATA SERVICE
// ============================================

class DataService {
    constructor() {
        this.sheetUrl = SHEETS_CONFIG.SHEET_URL;
        this.cache = {};
        this.lastFetch = null;
    }

    /**
     * Obtener todos los datos del dashboard desde Google Sheets
     */
    async fetchAllData() {
        return await this._callSheets('dashboard');
    }

    /**
     * Llamar al Apps Script via GET (evita CORS)
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

            if (data.error) throw new Error(data.error);

            if (action === 'dashboard') {
                this.cache = data;
                this.lastFetch = new Date();
            }

            return data;
        } catch (error) {
            console.error(`Error en _callSheets(${action}):`, error);

            // Para dashboard: intentar usar cache si hay
            if (action === 'dashboard' && Object.keys(this.cache).length > 0) {
                console.warn('Usando datos cacheados');
                return this.cache;
            }

            return { success: false, error: error.message, message: 'Error de conexión: ' + error.message };
        }
    }

    /**
     * ABRIR BARRERA - El servidor decide Entrada/Salida y calcula monto
     */
    async abrirBarrera(patente, operador = 'Sistema') {
        return await this._callSheets('abrir_barrera', { patente, operador });
    }

    /**
     * COBRAR DEUDA
     */
    async cobrarDeuda(patente) {
        return await this._callSheets('cobrar_deuda', { patente });
    }

    /**
     * Buscar vehículo en cache
     */
    buscarVehiculo(patente) {
        const p = patente.replace(/\s/g, '').toUpperCase();
        if (this.cache && this.cache.vehiculos) {
            return this.cache.vehiculos.find(v => v.patente === p) || null;
        }
        return null;
    }

    /**
     * Verificar si un vehículo está dentro
     */
    estaDentro(patente) {
        const p = patente.replace(/\s/g, '').toUpperCase();
        if (this.cache && this.cache.vehiculos_dentro) {
            return this.cache.vehiculos_dentro.includes(p);
        }
        return false;
    }
}

// Export global instance
const dataService = new DataService();
