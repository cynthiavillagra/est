/**
 * ============================================
 * GOOGLE APPS SCRIPT - ParkControl
 * ============================================
 * 
 * INSTRUCCIONES DE INSTALACIÓN:
 * 
 * 1. Abrir el Google Sheet con los datos
 * 2. Ir a Extensiones > Apps Script
 * 3. Borrar todo el contenido del archivo Code.gs
 * 4. Pegar este código completo
 * 5. Guardar (Ctrl+S)
 * 6. Implementar > Implementación nueva
 * 7. Tipo: Aplicación web
 * 8. Ejecutar como: Yo
 * 9. Quién tiene acceso: Cualquier persona
 * 10. Implementar y copiar la URL generada
 * 11. Pegar la URL en data.js -> SHEETS_CONFIG.SHEET_URL
 * 12. Cambiar SHEETS_CONFIG.USAR_SHEETS = true
 * 
 * ============================================
 */

function doGet(e) {
    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();

        // Leer configuración
        const configSheet = ss.getSheetByName('Configuracion');
        const config = sheetToKeyValue(configSheet);

        // Leer vehículos
        const vehiculosSheet = ss.getSheetByName('Vehiculos');
        const vehiculos = sheetToArray(vehiculosSheet);

        // Leer movimientos
        const movimientosSheet = ss.getSheetByName('Movimientos');
        const movimientos = sheetToArray(movimientosSheet);

        // Leer estadísticas
        const statsSheet = ss.getSheetByName('Estadisticas');
        const estadisticas = sheetToArray(statsSheet);

        // Calcular resumen
        const capacidadTotal = parseInt(config.capacidad_total) || 30;

        // Contar vehículos dentro (última entrada sin salida posterior)
        const vehiculosDentro = calcularVehiculosDentro(movimientos);
        const ocupados = vehiculosDentro.length;
        const libres = capacidadTotal - ocupados;
        const porcentajeOcupado = Math.round((ocupados / capacidadTotal) * 100);

        // Estadísticas de hoy
        const hoy = new Date();
        const hoyStr = Utilities.formatDate(hoy, Session.getScriptTimeZone(), 'yyyy-MM-dd');
        const movimientosHoy = movimientos.filter(m => m.fecha === hoyStr);
        const recaudacionHoy = movimientosHoy.reduce((sum, m) => sum + (parseFloat(m.monto) || 0), 0);
        const ingresosHoy = movimientosHoy.filter(m => m.tipo === 'Entrada').length;

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

        // Últimos movimientos
        const ultimosMovimientos = movimientos
            .sort((a, b) => {
                const dateA = new Date(a.fecha + 'T' + a.hora);
                const dateB = new Date(b.fecha + 'T' + b.hora);
                return dateB - dateA;
            })
            .slice(0, 10)
            .map(m => ({
                ...m,
                fecha: formatearFecha(m.fecha),
                estado: vehiculosDentro.includes(m.patente) ? 'Dentro' : 'Fuera'
            }));

        // Ocupación 24h
        const ocupacion24h = calcularOcupacion24h(movimientos, capacidadTotal);

        // Estadísticas del día desde la hoja
        const statsHoy = estadisticas.find(s => s.fecha === hoyStr) || {};

        const result = {
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
                ingresos_mes: parseInt(statsHoy.ingresos_mes) || 0,
                promedio_diario: parseInt(statsHoy.promedio_diario) || 0,
                hora_pico: (statsHoy.hora_pico_inicio || '17:00') + ' - ' + (statsHoy.hora_pico_fin || '19:00'),
            },
            ocupacion_24h: ocupacion24h,
            vehiculos: vehiculos,
        };

        return ContentService
            .createTextOutput(JSON.stringify(result))
            .setMimeType(ContentService.MimeType.JSON);

    } catch (error) {
        return ContentService
            .createTextOutput(JSON.stringify({ error: error.message }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

// ============================================
// doPost - ESCRITURA DE DATOS
// ============================================
// Recibe POST con JSON body:
// { action: "registrar_movimiento", data: { patente, tipo, monto, operador } }
// { action: "actualizar_deuda", data: { patente, deuda } }

function doPost(e) {
    try {
        const body = JSON.parse(e.postData.contents);
        const action = body.action;
        const data = body.data;

        let resultado = { success: false, message: 'Acción no reconocida' };

        switch (action) {
            case 'registrar_movimiento':
                resultado = registrarMovimiento(data);
                break;
            case 'actualizar_deuda':
                resultado = actualizarDeuda(data);
                break;
            case 'registrar_vehiculo':
                resultado = registrarVehiculo(data);
                break;
        }

        return ContentService
            .createTextOutput(JSON.stringify(resultado))
            .setMimeType(ContentService.MimeType.JSON);

    } catch (error) {
        return ContentService
            .createTextOutput(JSON.stringify({ success: false, error: error.message }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

/**
 * Registrar un movimiento (Entrada o Salida) en la hoja Movimientos
 */
function registrarMovimiento(data) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Movimientos');
    if (!sheet) return { success: false, message: 'Hoja Movimientos no encontrada' };

    const now = new Date();
    const fecha = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const hora = Utilities.formatDate(now, Session.getScriptTimeZone(), 'HH:mm:ss');

    const patente = (data.patente || '').toUpperCase().replace(/\s/g, '');
    const tipo = data.tipo || 'Entrada';         // Entrada o Salida
    const monto = parseFloat(data.monto) || 0;
    const operador = data.operador || 'Sistema';
    const observaciones = data.observaciones || '';

    // Agregar fila al final
    sheet.appendRow([patente, fecha, hora, tipo, monto, operador, observaciones]);

    return {
        success: true,
        message: `${tipo} registrada: ${patente} a las ${hora}`,
        data: { patente, fecha, hora, tipo, monto, operador }
    };
}

/**
 * Actualizar la deuda de un vehículo en la hoja Vehiculos
 */
function actualizarDeuda(data) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Vehiculos');
    if (!sheet) return { success: false, message: 'Hoja Vehiculos no encontrada' };

    const patente = (data.patente || '').toUpperCase().replace(/\s/g, '');
    const nuevaDeuda = parseFloat(data.deuda) || 0;

    const valores = sheet.getDataRange().getValues();
    const headers = valores[0].map(h => h.toString().toLowerCase().replace(/\s+/g, '_'));
    const colPatente = headers.indexOf('patente');
    const colDeuda = headers.indexOf('deuda');

    if (colPatente === -1 || colDeuda === -1) {
        return { success: false, message: 'Columnas patente/deuda no encontradas' };
    }

    for (let i = 1; i < valores.length; i++) {
        if (valores[i][colPatente].toString().toUpperCase() === patente) {
            sheet.getRange(i + 1, colDeuda + 1).setValue(nuevaDeuda);
            return { success: true, message: `Deuda de ${patente} actualizada a $${nuevaDeuda}` };
        }
    }

    return { success: false, message: `Vehículo ${patente} no encontrado` };
}

/**
 * Registrar un nuevo vehículo en la hoja Vehiculos
 */
function registrarVehiculo(data) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Vehiculos');
    if (!sheet) return { success: false, message: 'Hoja Vehiculos no encontrada' };

    const patente = (data.patente || '').toUpperCase().replace(/\s/g, '');
    const titular = data.titular || 'Sin identificar';
    const tipo = data.tipo || 'Auto';
    const habilitado = data.habilitado || 'SI';
    const abonado = data.abonado || 'NO';
    const deuda = parseFloat(data.deuda) || 0;

    // Verificar si ya existe
    const valores = sheet.getDataRange().getValues();
    for (let i = 1; i < valores.length; i++) {
        if (valores[i][0].toString().toUpperCase() === patente) {
            return { success: false, message: `Vehículo ${patente} ya existe` };
        }
    }

    sheet.appendRow([patente, titular, tipo, habilitado, abonado, deuda, '', '', Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd')]);

    return { success: true, message: `Vehículo ${patente} registrado` };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function sheetToArray(sheet) {
    if (!sheet) return [];
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return [];

    const headers = data[0].map(h => h.toString().toLowerCase().replace(/\s+/g, '_'));
    return data.slice(1).map(row => {
        const obj = {};
        headers.forEach((h, i) => {
            obj[h] = row[i] !== undefined ? row[i].toString() : '';
        });
        return obj;
    });
}

function sheetToKeyValue(sheet) {
    if (!sheet) return {};
    const data = sheet.getDataRange().getValues();
    const obj = {};
    data.forEach(row => {
        if (row[0]) obj[row[0].toString().toLowerCase().replace(/\s+/g, '_')] = row[1];
    });
    return obj;
}

function calcularVehiculosDentro(movimientos) {
    const estado = {};

    // Ordenar por fecha y hora
    const sorted = [...movimientos].sort((a, b) => {
        const dateA = new Date(a.fecha + 'T' + a.hora);
        const dateB = new Date(b.fecha + 'T' + b.hora);
        return dateA - dateB;
    });

    sorted.forEach(m => {
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
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    return entradas.length > 0 ? formatearFecha(entradas[0].fecha) : 'N/A';
}

function formatearFecha(fechaISO) {
    if (!fechaISO) return '';
    const parts = fechaISO.split('-');
    if (parts.length !== 3) return fechaISO;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function calcularOcupacion24h(movimientos, capacidad) {
    const labels = [];
    const data = [];
    const now = new Date();

    for (let i = 12; i >= 0; i--) {
        const hora = new Date(now.getTime() - i * 2 * 3600000);
        labels.push(Utilities.formatDate(hora, Session.getScriptTimeZone(), 'HH:mm'));

        // Simplified: count entries before this time
        const count = movimientos.filter(m => {
            const mDate = new Date(m.fecha + 'T' + m.hora);
            return mDate <= hora && m.tipo === 'Entrada';
        }).length;

        data.push(Math.min(count, capacidad));
    }

    return { labels, data };
}
