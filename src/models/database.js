const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../config/bodega.db');

// Crear conexión a la base de datos
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error conectando a la base de datos:', err.message);
    } else {
        console.log('✅ Conectado a la base de datos SQLite');
    }
});

// Inicializar tablas
const initializeDatabase = async () => {
    const bcrypt = require('bcryptjs');
    
    db.serialize(() => {
        // Tabla de usuarios
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                full_name TEXT,
                role TEXT DEFAULT 'user' CHECK(role IN ('admin', 'user')),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_login DATETIME
            )
        `);
        
        // Tabla de categorías
        db.run(`
            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Tabla de productos/materiales
        db.run(`
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                description TEXT,
                category_id INTEGER,
                stock INTEGER DEFAULT 0,
                min_stock INTEGER DEFAULT 5,
                unit_type TEXT DEFAULT 'unidad' CHECK(unit_type IN ('unidad', 'peso')),
                weight_per_unit REAL,
                units_per_weight_reference INTEGER DEFAULT 10,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (category_id) REFERENCES categories (id)
            )
        `);

        // Tabla de movimientos (entradas y salidas)
        db.run(`
            CREATE TABLE IF NOT EXISTS movements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id INTEGER,
                type TEXT CHECK(type IN ('entrada', 'salida')),
                quantity INTEGER NOT NULL,
                reason TEXT,
                responsible TEXT,
                date DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES products (id)
            )
        `);

        // Insertar categorías predeterminadas
        const defaultCategories = [
            { name: 'Pernería', description: 'Tornillos, pernos, tuercas, arandelas' },
            { name: 'Componentes Eléctricos', description: 'PLC, relés, contactores, cables, borneras, breakers' },
            { name: 'Pinturas', description: 'Spray, esmaltes, selladores' },
            { name: 'EPP', description: 'Guantes, cascos, chalecos reflectantes, gafas' },
            { name: 'Herramientas', description: 'Herramientas manuales y eléctricas' },
            { name: 'Planchas y Perfilería', description: 'Planchas metálicas y perfiles' },
            { name: 'Componentes Electrónicos', description: 'Resistencias, capacitores, circuitos' },
            { name: 'Accesorios Varios', description: 'Diversos materiales y accesorios' }
        ];

        defaultCategories.forEach(category => {
            db.run(
                'INSERT OR IGNORE INTO categories (name, description) VALUES (?, ?)',
                [category.name, category.description]
            );
        });

        // Productos de ejemplo
        const exampleProducts = [
            { code: 'PERN001', name: 'Tornillo Allen M6x20', category: 'Pernería', stock: 100 },
            { code: 'ELECT001', name: 'PLC Siemens S7-1200', category: 'Componentes Eléctricos', stock: 3 },
            { code: 'PINT001', name: 'Pintura Spray Negro Mate', category: 'Pinturas', stock: 15 },
            { code: 'EPP001', name: 'Casco de Seguridad Blanco', category: 'EPP', stock: 25 }
        ];

        exampleProducts.forEach(product => {
            db.get('SELECT id FROM categories WHERE name = ?', [product.category], (err, row) => {
                if (row) {
                    db.run(
                        'INSERT OR IGNORE INTO products (code, name, category_id, stock) VALUES (?, ?, ?, ?)',
                        [product.code, product.name, row.id, product.stock]
                    );
                }
            });
        });

        // Crear usuarios predeterminados
        const defaultUsers = [
            {
                username: 'zaida',
                full_name: 'Zaida',
                role: 'admin',
                password: 'ZAIDA123'
            },
            {
                username: 'luis',
                full_name: 'Luis',
                role: 'admin',
                password: 'LUIS123'
            },
            {
                username: 'giselle',
                full_name: 'Giselle',
                role: 'user',
                password: 'GISELLE123'
            }
        ];

        // Insertar usuarios con contraseñas hasheadas
        defaultUsers.forEach(async (user) => {
            // Verificar si el usuario ya existe
            db.get('SELECT id FROM users WHERE username = ?', [user.username], async (err, row) => {
                if (err) {
                    console.error('❌ Error verificando usuario:', err.message);
                    return;
                }
                
                if (!row) {
                    try {
                        // Hash de la contraseña
                        const hashedPassword = await bcrypt.hash(user.password, 10);
                        
                        // Insertar usuario
                        db.run(
                            'INSERT INTO users (username, password, full_name, role) VALUES (?, ?, ?, ?)',
                            [user.username, hashedPassword, user.full_name, user.role],
                            function(err) {
                                if (err) {
                                    console.error(`❌ Error creando usuario ${user.username}:`, err.message);
                                } else {
                                    console.log(`👤 Usuario creado: ${user.username} (${user.role})`);
                                }
                            }
                        );
                    } catch (error) {
                        console.error(`❌ Error hasheando contraseña para ${user.username}:`, error);
                    }
                }
            });
        });

        console.log('📦 Base de datos inicializada con categorías y productos de ejemplo');
        console.log('👥 Usuarios del sistema configurados');
    });
}

module.exports = { db, initializeDatabase };
