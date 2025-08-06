# 🏪 Sistema de Control de Bodega

Sistema de gestión de inventario para control de stock, productos y movimientos de almacén.

## 🔒 **IMPORTANTE - SEGURIDAD**

**⚠️ ESTE ES UN REPOSITORIO PRIVADO - SOLO USUARIOS AUTORIZADOS**

### 🛡️ Configuración de Seguridad Implementada:
- ✅ Base de datos no incluida en el repositorio (`.gitignore`)
- ✅ Contraseñas hasheadas con bcrypt
- ✅ Variables de entorno para configuración sensible
- ✅ Logs excluidos del control de versiones
- ✅ Archivos de sesión protegidos

## 🚀 Instalación

1. **Clonar el repositorio** (solo usuarios autorizados):
```bash
git clone [URL_DEL_REPOSITORIO]
cd lang-bodega-control
```

2. **Instalar dependencias**:
```bash
npm install
```

3. **Configurar variables de entorno**:
Crear archivo `.env` en la raíz del proyecto:
```env
NODE_ENV=production
PORT=3000
SESSION_SECRET=tu_clave_secreta_muy_segura_aqui
DB_PATH=./config/bodega.db
```

4. **Inicializar la base de datos**:
```bash
npm start
```

## 👥 Usuarios del Sistema

Los siguientes usuarios se crean automáticamente en la primera ejecución:

| Usuario | Rol | Descripción |
|---------|-----|-------------|
| zaida | Administrador | Acceso completo al sistema |
| luis | Administrador | Acceso completo al sistema |
| giselle | Usuario | Acceso de usuario estándar |

**🔐 Las contraseñas son proporcionadas de forma segura a cada usuario autorizado.**

## 🗄️ Estructura del Proyecto

```
📁 lang-bodega-control/
├── 📄 app.js              # Servidor principal
├── 📁 src/
│   ├── 📁 controllers/    # Lógica de negocio
│   ├── 📁 models/         # Modelos de datos
│   ├── 📁 routes/         # Rutas de la API
│   └── 📁 middleware/     # Middleware de autenticación
├── 📁 public/             # Archivos estáticos
├── 📁 views/              # Templates EJS
├── 📁 config/             # Configuración (NO en repo)
└── 📁 reports/            # Reportes generados
```

## ⚡ Scripts Disponibles

```bash
npm start          # Iniciar servidor en producción
npm run dev        # Iniciar en modo desarrollo
npm run test       # Ejecutar tests
npm run backup     # Crear respaldo de BD
```

## 🔧 Funcionalidades

### 📦 Gestión de Productos
- ➕ Agregar productos con código único
- 📝 Categorización de productos
- 📊 Control de stock mínimo
- ⚖️ Manejo por unidades o peso

### 📈 Control de Inventario
- 📥 Registrar entradas
- 📤 Registrar salidas
- 📋 Historial de movimientos
- 🚨 Alertas de stock bajo

### 👤 Sistema de Usuarios
- 🔐 Autenticación segura
- 🎛️ Roles y permisos
- 📝 Registro de actividades

### 📊 Reportes
- 📈 Reportes de inventario
- 📋 Movimientos por período
- 🎯 Productos con stock crítico

## 🛠️ Tecnologías

- **Backend**: Node.js + Express
- **Base de Datos**: SQLite3
- **Autenticación**: bcryptjs + express-session
- **Frontend**: EJS + CSS + JavaScript
- **Reportes**: Librería de generación PDF

## 🔒 Medidas de Seguridad

1. **Control de Acceso**:
   - Autenticación obligatoria
   - Sesiones seguras
   - Control de roles

2. **Protección de Datos**:
   - Contraseñas hasheadas
   - Base de datos local
   - Logs protegidos

3. **Repositorio**:
   - Información sensible excluida
   - Solo usuarios autorizados
   - Historial controlado

## 🚨 **ADVERTENCIAS DE SEGURIDAD**

- ❌ **NUNCA** commitear archivos `.db` o `.env`
- ❌ **NUNCA** subir contraseñas en texto plano
- ❌ **NUNCA** hacer público este repositorio
- ✅ **SIEMPRE** usar HTTPS en producción
- ✅ **SIEMPRE** crear respaldos regulares
- ✅ **SIEMPRE** mantener dependencias actualizadas

## 📞 Soporte

Solo usuarios autorizados pueden acceder a este sistema.
Para soporte contactar al administrador del sistema.

---
**🔐 Repositorio Privado - Acceso Restringido - Información Confidencial**
