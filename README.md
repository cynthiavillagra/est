# 🅿️ ParkControl - Sistema de Gestión de Estacionamiento

## 📋 Descripción
Dashboard de gestión de estacionamiento inteligente con lectura de patentes, control de ocupación en tiempo real, gestión de deudas y estadísticas.

## 🚀 Ejecución Rápida
Simplemente abrir `index.html` en un navegador. Los datos de demostración se cargan automáticamente.

## 📊 Estructura de Google Sheets

Para conectar con datos reales, crear un Google Sheet con estas **4 hojas**:

### Hoja 1: `Configuracion`
| campo | valor |
|-------|-------|
| capacidad_total | 30 |
| tarifa_hora | 500 |
| tarifa_fraccion | 250 |
| nombre_parking | ParkControl Central |
| direccion | Av. Corrientes 1234 |

### Hoja 2: `Vehiculos`
| patente | titular | tipo | habilitado | abonado | deuda |
|---------|---------|------|------------|---------|-------|
| AA123BB | Juan Pérez | Auto | SI | SI | 0 |
| AC456DF | María García | Auto | SI | NO | 3500 |

### Hoja 3: `Movimientos`
| patente | fecha | hora | tipo | monto | operador |
|---------|-------|------|------|-------|----------|
| AA123BB | 2026-05-08 | 10:42:28 | Entrada | 0 | Sistema |
| AE101IJ | 2026-05-08 | 10:20:11 | Salida | 750 | Sistema |

### Hoja 4: `Estadisticas`
| fecha | ingresos_dia | recaudacion_dia | ocupacion_max | hora_pico_inicio | hora_pico_fin | ingresos_mes | promedio_diario |
|-------|--------------|-----------------|---------------|------------------|---------------|--------------|-----------------|
| 2026-05-08 | 87 | 48750 | 25 | 17:00 | 19:00 | 1245 | 62 |

## 🔗 Conectar Google Sheets

1. Crear el Google Sheet con la estructura de arriba
2. Ir a **Extensiones > Apps Script**
3. Pegar el contenido de `google_apps_script.js`
4. **Implementar > Implementación nueva > App web**
   - Ejecutar como: Yo
   - Acceso: Cualquier persona
5. Copiar la URL generada
6. En `data.js`, configurar:
   ```javascript
   USAR_SHEETS: true,
   SHEET_URL: 'https://script.google.com/macros/s/TU_ID/exec',
   ```

## 📁 Estructura del Proyecto
```
2026-estacionamiento/
├── index.html              # Página principal
├── styles.css              # Estilos del dashboard
├── data.js                 # Capa de datos + mock data
├── app.js                  # Lógica de la aplicación
├── google_apps_script.js   # Script para Google Sheets
├── assets/
│   └── img/
│       └── car_plate_sample.png
└── README.md
```

## 🛠 Tecnologías
- HTML5, CSS3, JavaScript ES6+
- Chart.js (gráficos)
- Font Awesome (iconos)
- Google Fonts (Inter)
- Google Sheets API (vía Apps Script)
