# 📦 L.A.N.G. Bodega Control

Sistema de control de inventario y gestión de bodega desarrollado para L.A.N.G.

## ✨ Características

- **Gestión de Inventario**: Control completo de productos y stock
- **Manejo por Peso**: Soporte especial para productos de pernería con cálculo automático de unidades
- **Categorías**: Organización por categorías (Electrónicos, Herramientas, Pernería, etc.)
- **Movimientos**: Registro de entradas y salidas de productos
- **Reportes**: Generación de reportes de inventario
- **Autenticación**: Sistema seguro de login con JWT
- **Dashboard**: Interface moderna y responsive

## 🔧 Instalación

### Requisitos Previos
- Node.js (versión 14 o superior)
- npm o yarn

### Pasos de Instalación

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/TU-USUARIO/lang-bodega-control.git
   cd lang-bodega-control
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   ```bash
   cp .env.example .env
   ```
   
   Edita el archivo `.env` y configura:
   - `ADMIN_USERNAME`: Tu nombre de usuario
   - `ADMIN_PASSWORD`: Tu contraseña
   - `JWT_SECRET`: Una clave secreta segura

4. **Iniciar el servidor**
   ```bash
   npm start
   ```

5. **Acceder al sistema**
   - Aplicación: http://localhost:3000
   - Dashboard: http://localhost:3000/dashboard

## 📊 Uso

### Productos Normales
- Agregar productos con código, nombre, categoría y stock
- Gestión tradicional por unidades

### Productos de Pernería (Por Peso)
- Seleccionar "Por Peso (Pernería)" como tipo de manejo
- Ingresar peso por unidad en gramos
- Usar calculadora integrada para estimar unidades basado en peso total
- El sistema calcula automáticamente el stock estimado

### Calculadora de Peso
- Ingresa el peso total disponible
- El sistema calcula las unidades estimadas usando la fórmula:
  ```
  Unidades = (Peso Total ÷ Peso de Referencia) × Unidades de Referencia
  ```

## 🛠️ Tecnologías

- **Backend**: Node.js, Express.js
- **Base de Datos**: SQLite3
- **Autenticación**: JWT (JSON Web Tokens)
- **Frontend**: HTML5, CSS3, JavaScript Vanilla
- **Estilos**: CSS Grid, Flexbox, Dark Theme

## 📁 Estructura del Proyecto

```
├── app.js                 # Servidor principal
├── package.json           # Dependencias y scripts
├── .env.example          # Variables de entorno de ejemplo
├── src/
│   ├── models/
│   │   └── database.js   # Configuración de base de datos
│   └── routes/
│       └── inventory.js  # Rutas del inventario
├── public/
│   ├── css/
│   │   └── styles.css    # Estilos principales
│   ├── js/
│   │   └── inventory.js  # Lógica del frontend
│   ├── dashboard.html    # Interface principal
│   └── index.html       # Página de login
└── config/
    └── bodega.db        # Base de datos SQLite
```

## 🔐 Seguridad

- Las credenciales se almacenan en variables de entorno
- Autenticación mediante JWT
- Base de datos y archivos sensibles excluidos del repositorio
- Validación de datos en frontend y backend

## 📝 Licencia

Este proyecto es propietario de L.A.N.G.

## 🤝 Contribución

Para contribuir al proyecto, contacta al equipo de desarrollo de L.A.N.G.

---

**Desarrollado con ❤️ para L.A.N.G.**
