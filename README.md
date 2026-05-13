# 🅿️ ParkControl - Sistema de Gestión de Estacionamiento

## 📋 Descripción
Dashboard inteligente para gestión de estacionamientos con:
- Lectura de patentes en tiempo real
- Control de ocupación y estadísticas
- Registro automático de entradas/salidas con cálculo de tarifas
- Gestión de deudores y abonados
- Login con roles y permisos (Admin, Operador, Visor)
- Conexión bidireccional con Google Sheets como base de datos

---

## 🚀 Guía de Instalación Paso a Paso

### Paso 1: Descargar el proyecto
```
git clone https://github.com/cynthiavillagra/est.git
```
O descargar como ZIP desde GitHub.

### Paso 2: Preparar la hoja de cálculo

**Opción A — Generar el Excel** (recomendado):
1. Tener Python instalado con `openpyxl` (`pip install openpyxl`)
2. Ejecutar:
   ```
   python crear_excel.py
   ```
3. Se genera `ParkControl_Data.xlsx` con las 6 hojas, datos de ejemplo y fórmulas
4. Subir el archivo a **Google Drive** → click derecho → **Abrir con Google Sheets**

**Opción B — Crear manualmente en Google Sheets**:
Crear un Google Sheet con las 5 hojas de datos descritas más abajo.

### Paso 3: Configurar el Apps Script (conexión bidireccional)

1. Abrir tu Google Sheet en el navegador
2. Ir a **Extensiones → Apps Script**
3. Borrar todo el contenido del archivo `Code.gs`
4. Abrir el archivo `google_apps_script.js` del proyecto y **copiar todo su contenido**
5. Pegar en `Code.gs` y guardar (Ctrl+S)
6. Ir a **Implementar → Implementación nueva**
   - Tipo: **Aplicación web**
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier persona**
7. Click en **Implementar**
8. Copiar la URL generada (se ve así: `https://script.google.com/macros/s/XXXXX/exec`)

> ⚠️ **Cada vez que modifiques el código del Apps Script**, debés crear una **nueva implementación** para que los cambios se apliquen. Ir a Implementar → Administrar implementaciones → ✏️ Editar → Nueva versión → Implementar.

### Paso 4: Conectar el dashboard con Google Sheets

Abrir el archivo `data.js` y modificar estas 2 líneas:

```javascript
const SHEETS_CONFIG = {
    USAR_SHEETS: true,    // ← Poner en true
    SHEET_URL: 'https://script.google.com/macros/s/TU_URL_ACA/exec',  // ← Pegar tu URL
    REFRESH_INTERVAL: 30000,
};
```

### Paso 5: Abrir el sistema

Abrir `login.html` en el navegador. Listo.

> 💡 **Modo sin conexión**: Si querés probar sin Google Sheets, dejá `USAR_SHEETS: false` en `data.js`. El sistema carga datos de demostración automáticamente.

---

## 🔐 Sistema de Login

### Usuarios de demostración

| Usuario | Contraseña | Rol | Acceso |
|---------|------------|-----|--------|
| `admin` | `admin123` | Administrador | Todo |
| `operador` | `oper123` | Operador | Operaciones diarias |
| `visor` | `visor123` | Visor | Solo consulta |

### Permisos por rol

| Funcionalidad | Admin | Operador | Visor |
|---------------|:-----:|:--------:|:-----:|
| Ver dashboard y estadísticas | ✅ | ✅ | ✅ |
| Abrir barrera (Entrada/Salida) | ✅ | ✅ | ❌ |
| Ver historial y vehículos | ✅ | ✅ | ❌ |
| Ver/cobrar deudas | ✅ | ✅/❌ | ❌ |
| Configuración y usuarios | ✅ | ❌ | ❌ |

---

## 📊 Estructura de la Hoja de Cálculo

### Hoja 1: `Configuracion`
| campo | valor |
|-------|-------|
| capacidad_total | 30 |
| tarifa_hora | 500 |
| tarifa_fraccion | 250 |
| tarifa_dia | 3500 |
| nombre_parking | ParkControl Central |
| direccion | Av. Corrientes 1234, CABA |

### Hoja 2: `Vehiculos`
| patente | titular | tipo | habilitado | abonado | deuda |
|---------|---------|------|------------|---------|-------|
| AA123BB | Juan Pérez | Auto | SI | SI | 0 |
| AC456DF | María García | Auto | SI | NO | 3500 |

- **tipo**: Auto, Camioneta, Moto
- **habilitado**: SI / NO
- **abonado**: SI (no cobra al salir) / NO

### Hoja 3: `Movimientos`
| patente | fecha | hora | tipo | monto | operador | observaciones |
|---------|-------|------|------|-------|----------|---------------|
| AA123BB | 2026-05-13 | 10:42:28 | Entrada | 0 | Administrador | |
| AA123BB | 2026-05-13 | 12:15:03 | Salida | 1000 | Administrador | Tiempo: 1h 32m |

> Esta hoja se llena **automáticamente** cuando se usa el botón "ABRIR BARRERA".

### Hoja 4: `Estadisticas`
| fecha | ingresos_dia | recaudacion_dia | ocupacion_max | hora_pico_inicio | hora_pico_fin | ingresos_mes | promedio_diario |
|-------|--------------|-----------------|---------------|------------------|---------------|--------------|-----------------|
| 2026-05-13 | 87 | 48750 | 25 | 17:00 | 19:00 | 1245 | 62 |

### Hoja 5: `Usuarios`
| usuario | password | nombre | rol | activo |
|---------|----------|--------|-----|--------|
| admin | admin123 | Administrador | admin | SI |
| operador | oper123 | Juan Operador | operador | SI |
| visor | visor123 | María Consulta | visor | SI |

- **Roles válidos**: `admin`, `operador`, `visor`

---

## 🔄 Cómo funciona la conexión (Arquitectura)

```
┌──────────────┐      GET ?action=dashboard      ┌────────────────┐      Lee/Escribe      ┌──────────────┐
│   FRONTEND   │ ──────────────────────────────→  │  APPS SCRIPT   │ ──────────────────→   │ GOOGLE SHEET │
│  (HTML/JS)   │ ←──────────────────────────────  │  (servidor)    │ ←──────────────────   │   (BBDD)     │
└──────────────┘      Respuesta JSON              └────────────────┘                       └──────────────┘
```

### API disponible (todo via GET)

| Acción | URL | Qué hace |
|--------|-----|----------|
| Dashboard | `?action=dashboard` | Devuelve todos los datos |
| Abrir barrera | `?action=abrir_barrera&patente=XX&operador=YY` | Registra Entrada o Salida |
| Cobrar deuda | `?action=cobrar_deuda&patente=XX` | Pone deuda en $0 |
| Consultar vehículo | `?action=consultar_vehiculo&patente=XX` | Info del vehículo |

> Se usa GET en lugar de POST para evitar bloqueos de CORS al abrir desde `file://`.

### Lógica de cobro (corre en el servidor)

| Condición | Tarifa |
|-----------|--------|
| Abonado | $0 (sin cargo) |
| Tiempo ≤ 30 minutos | Fracción: $250 |
| Tiempo > 30 minutos | Por hora: $500/h (redondeado hacia arriba) |
| Tope diario | Máximo: $3500 |
| Vehículo no registrado | Se registra automáticamente |

---

## 🔄 Mapeo Google Sheets → SQL (migración futura)

| Hoja (Sheet) | Tabla SQL | Notas |
|-------------|-----------|-------|
| `Configuracion` | `configuracion` | Key-value → columnas tipadas |
| `Vehiculos` | `vehiculos` | `habilitado`/`abonado`: texto → BOOLEAN |
| `Movimientos` | `movimientos` | `fecha`/`hora`: texto → DATE/TIME, FK a vehiculos |
| `Estadisticas` | `estadisticas_diarias` | Fórmulas del Sheet → queries SQL |
| `Usuarios` | `usuarios` | `password`: texto plano → bcrypt hash |

| Aspecto | Sheet (actual) | SQL (futuro) |
|---------|---------------|--------------|
| Contraseñas | Texto plano | bcrypt hash |
| Validación | Client-side (JS) | Server-side (API) |
| Tipos de dato | Todo texto | DATE, DECIMAL, ENUM |
| Relaciones | Sin FK | FK movimientos → vehiculos |

---

## 📁 Estructura del Proyecto

```
2026-estacionamiento/
├── login.html              # Página de inicio de sesión
├── login.css               # Estilos del login
├── auth.js                 # Autenticación y permisos por rol
├── index.html              # Dashboard principal (protegido)
├── styles.css              # Estilos del dashboard
├── data.js                 # Conexión a Sheets + datos mock (fallback)
├── data_mock_backup.js     # Backup de datos mock originales
├── app.js                  # Lógica de la aplicación
├── google_apps_script.js   # Código del servidor (pegar en Apps Script)
├── crear_excel.py          # Genera ParkControl_Data.xlsx
├── ParkControl_Data.xlsx   # Excel listo para subir a Google Drive
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
- Google Apps Script (servidor / API)
- Google Sheets (base de datos provisoria)
- Python + openpyxl (generador del Excel)

## 📌 Notas
- La autenticación actual es **client-side** (mock). Al migrar a SQL, la validación será server-side.
- Las contraseñas en el Sheet son provisorias. Con BBDD se usará hashing seguro.
- El sistema usa atributos HTML (`data-permission`, `data-role`) para mostrar/ocultar elementos según el rol.
- Si la conexión a Sheets falla, el dashboard carga datos mock automáticamente.
- El archivo `data_mock_backup.js` es una copia de seguridad del `data.js` original con datos de demo.
