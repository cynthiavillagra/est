# 🅿️ ParkControl - Sistema de Gestión de Estacionamiento

## 📋 Descripción
Dashboard de gestión de estacionamiento inteligente con lectura de patentes, control de ocupación en tiempo real, gestión de deudas, estadísticas y **sistema de login con roles y permisos**.

## 🚀 Ejecución Rápida
1. Abrir `login.html` en un navegador
2. Iniciar sesión con uno de los usuarios de demostración
3. Los datos de demo se cargan automáticamente

## 🔐 Sistema de Login y Permisos

### Usuarios de demostración

| Usuario | Contraseña | Rol | Descripción |
|---------|------------|-----|-------------|
| `admin` | `admin123` | Admin | Acceso total al sistema |
| `operador` | `oper123` | Operador | Operaciones diarias |
| `visor` | `visor123` | Visor | Solo consulta |

### Roles y permisos detallados

| Permiso | Admin | Operador | Visor |
|---------|:-----:|:--------:|:-----:|
| Ver dashboard | ✅ | ✅ | ✅ |
| Ver estadísticas | ✅ | ✅ | ✅ |
| Abrir barrera | ✅ | ✅ | ❌ |
| Ver historial | ✅ | ✅ | ❌ |
| Ver vehículos | ✅ | ✅ | ❌ |
| Gestionar vehículos | ✅ | ❌ | ❌ |
| Ver deudas | ✅ | ✅ | ❌ |
| Cobrar deudas | ✅ | ❌ | ❌ |
| Ver reportes | ✅ | ❌ | ❌ |
| Ver/gestionar abonados | ✅ | ✅/❌ | ❌ |
| Configuración | ✅ | ❌ | ❌ |
| Gestionar usuarios | ✅ | ❌ | ❌ |

## 📊 Estructura de Google Sheets / Excel

Para conectar con datos reales, crear un Google Sheet con estas **5 hojas**:

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

### Hoja 5: `Usuarios`
| usuario | password | nombre | rol | activo |
|---------|----------|--------|-----|--------|
| admin | admin123 | Administrador | admin | SI |
| operador | oper123 | Juan Operador | operador | SI |
| visor | visor123 | María Consulta | visor | SI |

> **Roles válidos:** `admin`, `operador`, `visor`

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
├── login.html              # Página de inicio de sesión
├── login.css               # Estilos del login
├── auth.js                 # Autenticación y permisos
├── index.html              # Dashboard principal (protegido)
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

## � Mapeo Google Sheets → SQL

Referencia para la futura migración a base de datos relacional.

### Correspondencia de hojas y tablas

| Hoja (Sheet) | Tabla SQL | Descripción |
|-------------|-----------|-------------|
| `Configuracion` | `configuracion` | Parámetros del sistema |
| `Vehiculos` | `vehiculos` | Registro maestro de vehículos |
| `Movimientos` | `movimientos` | Log de entradas y salidas |
| `Estadisticas` | `estadisticas_diarias` | Resumen consolidado por día |
| `Usuarios` | `usuarios` | Cuentas de acceso al sistema |

### SQL: `configuracion`
```sql
CREATE TABLE configuracion (
    id              INT PRIMARY KEY AUTO_INCREMENT,
    campo           VARCHAR(50) UNIQUE NOT NULL,    -- Sheet col: campo
    valor           VARCHAR(255)                     -- Sheet col: valor
);
-- Ejemplo: ('capacidad_total', '30'), ('tarifa_hora', '500')
```

### SQL: `vehiculos`
```sql
CREATE TABLE vehiculos (
    id              INT PRIMARY KEY AUTO_INCREMENT,
    patente         VARCHAR(10) UNIQUE NOT NULL,     -- Sheet col: patente
    titular         VARCHAR(100),                     -- Sheet col: titular
    tipo            VARCHAR(20) DEFAULT 'Auto',      -- Sheet col: tipo (Auto/Camioneta/Moto)
    habilitado      BOOLEAN DEFAULT TRUE,            -- Sheet col: habilitado (SI/NO → true/false)
    abonado         BOOLEAN DEFAULT FALSE,           -- Sheet col: abonado (SI/NO → true/false)
    deuda           DECIMAL(10,2) DEFAULT 0.00,      -- Sheet col: deuda
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### SQL: `movimientos`
```sql
CREATE TABLE movimientos (
    id              INT PRIMARY KEY AUTO_INCREMENT,
    patente         VARCHAR(10) NOT NULL,            -- Sheet col: patente
    fecha           DATE NOT NULL,                    -- Sheet col: fecha (texto → DATE)
    hora            TIME NOT NULL,                    -- Sheet col: hora (texto → TIME)
    tipo            ENUM('Entrada','Salida') NOT NULL,-- Sheet col: tipo
    monto           DECIMAL(10,2) DEFAULT 0.00,      -- Sheet col: monto
    operador        VARCHAR(50) DEFAULT 'Sistema',   -- Sheet col: operador
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patente) REFERENCES vehiculos(patente)
);
-- Índices recomendados:
CREATE INDEX idx_mov_patente ON movimientos(patente);
CREATE INDEX idx_mov_fecha ON movimientos(fecha);
CREATE INDEX idx_mov_tipo ON movimientos(tipo);
```

### SQL: `estadisticas_diarias`
```sql
CREATE TABLE estadisticas_diarias (
    id                INT PRIMARY KEY AUTO_INCREMENT,
    fecha             DATE UNIQUE NOT NULL,           -- Sheet col: fecha
    ingresos_dia      INT DEFAULT 0,                  -- Sheet col: ingresos_dia
    recaudacion_dia   DECIMAL(12,2) DEFAULT 0.00,     -- Sheet col: recaudacion_dia
    ocupacion_max     INT DEFAULT 0,                   -- Sheet col: ocupacion_max
    hora_pico_inicio  TIME,                            -- Sheet col: hora_pico_inicio
    hora_pico_fin     TIME,                            -- Sheet col: hora_pico_fin
    ingresos_mes      INT DEFAULT 0,                   -- Sheet col: ingresos_mes
    promedio_diario   INT DEFAULT 0                    -- Sheet col: promedio_diario
);
```

### SQL: `usuarios`
```sql
CREATE TABLE usuarios (
    id              INT PRIMARY KEY AUTO_INCREMENT,
    usuario         VARCHAR(50) UNIQUE NOT NULL,      -- Sheet col: usuario
    password_hash   VARCHAR(255) NOT NULL,            -- Sheet col: password → bcrypt hash
    nombre          VARCHAR(100),                      -- Sheet col: nombre
    rol             ENUM('admin','operador','visor')   -- Sheet col: rol
                    NOT NULL DEFAULT 'visor',
    activo          BOOLEAN DEFAULT TRUE,              -- Sheet col: activo (SI/NO → true/false)
    ultimo_login    TIMESTAMP NULL,                    -- (nuevo) no existe en Sheet
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Notas de migración
| Aspecto | Sheet (actual) | SQL (futuro) |
|---------|---------------|--------------|
| Contraseñas | Texto plano | `bcrypt` hash |
| Validación de login | Client-side (JS) | Server-side (API) |
| Tipos de dato | Todo texto | Tipado estricto (DATE, DECIMAL, ENUM) |
| Relaciones | Sin relaciones | FK `movimientos.patente → vehiculos.patente` |
| Campos nuevos | — | `created_at`, `updated_at`, `ultimo_login` |
| Permisos | Tabla en `auth.js` | Tabla `roles_permisos` (normalizable) |

## 📌 Notas
- La autenticación actual es **client-side** (mock data). Cuando se conecte la BBDD SQL, la validación se hará server-side.
- Las contraseñas en el Excel/Sheet son provisorias. En la versión con BBDD se usará hashing seguro.
- El sistema de permisos usa atributos HTML (`data-permission`, `data-role`) para ocultar/mostrar elementos según el rol del usuario logueado.


