const express = require('express');
const { db } = require('../models/database');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Aplicar autenticación a todas las rutas del inventario
router.use(authenticateToken);

// Obtener todas las categorías
router.get('/categories', (req, res) => {
    db.all('SELECT * FROM categories ORDER BY name', (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Obtener productos por categoría
router.get('/products/:categoryId', (req, res) => {
    const { categoryId } = req.params;
    
    const query = `
        SELECT p.*, c.name as category_name 
        FROM products p 
        JOIN categories c ON p.category_id = c.id 
        WHERE p.category_id = ?
        ORDER BY p.name
    `;
    
    db.all(query, [categoryId], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Obtener todos los productos con búsqueda
router.get('/products', (req, res) => {
    const { search } = req.query;
    let query = `
        SELECT p.*, c.name as category_name 
        FROM products p 
        JOIN categories c ON p.category_id = c.id
    `;
    let params = [];

    if (search) {
        query += ' WHERE p.name LIKE ? OR p.code LIKE ? OR p.description LIKE ?';
        const searchTerm = `%${search}%`;
        params = [searchTerm, searchTerm, searchTerm];
    }

    query += ' ORDER BY p.name';

    db.all(query, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Agregar nuevo producto
router.post('/products', (req, res) => {
    const { 
        code, 
        name, 
        description, 
        category_id, 
        stock = 0, 
        min_stock = 5,
        unit_type = 'unidad',
        weight_per_unit,
        units_per_weight_reference = 10
    } = req.body;

    if (!code || !name || !category_id) {
        return res.status(400).json({ 
            error: 'Código, nombre y categoría son requeridos' 
        });
    }

    // Validar campos específicos para productos por peso
    if (unit_type === 'peso' && (!weight_per_unit || weight_per_unit <= 0)) {
        return res.status(400).json({
            error: 'El peso por unidad es requerido para productos manejados por peso'
        });
    }

    const query = `
        INSERT INTO products (code, name, description, category_id, stock, min_stock, unit_type, weight_per_unit, units_per_weight_reference)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(query, [code, name, description, category_id, stock, min_stock, unit_type, weight_per_unit, units_per_weight_reference], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ 
                    error: 'El código del producto ya existe' 
                });
            }
            return res.status(500).json({ error: err.message });
        }

        // Si se agregó stock inicial, registrar movimiento
        if (stock > 0) {
            const movementQuery = `
                INSERT INTO movements (product_id, type, quantity, reason, responsible)
                VALUES (?, 'entrada', ?, 'Stock inicial', ?)
            `;
            
            db.run(movementQuery, [this.lastID, stock, req.user.username]);
        }

        res.json({ 
            success: true, 
            id: this.lastID,
            message: 'Producto agregado exitosamente' 
        });
    });
});

// Movimiento de stock (entrada o salida)
router.post('/movement', (req, res) => {
    const { product_id, type, quantity, reason } = req.body;

    if (!product_id || !type || !quantity) {
        return res.status(400).json({ 
            error: 'ID del producto, tipo y cantidad son requeridos' 
        });
    }

    if (!['entrada', 'salida'].includes(type)) {
        return res.status(400).json({ 
            error: 'Tipo debe ser "entrada" o "salida"' 
        });
    }

    // Verificar stock actual si es salida
    if (type === 'salida') {
        db.get('SELECT stock FROM products WHERE id = ?', [product_id], (err, row) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            if (!row) {
                return res.status(404).json({ error: 'Producto no encontrado' });
            }

            if (row.stock < quantity) {
                return res.status(400).json({ 
                    error: `Stock insuficiente. Disponible: ${row.stock}` 
                });
            }

            executeMovement();
        });
    } else {
        executeMovement();
    }

    function executeMovement() {
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');

            // Insertar movimiento
            const movementQuery = `
                INSERT INTO movements (product_id, type, quantity, reason, responsible)
                VALUES (?, ?, ?, ?, ?)
            `;

            db.run(movementQuery, [product_id, type, quantity, reason, req.user.username], function(err) {
                if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: err.message });
                }

                // Actualizar stock del producto
                const stockChange = type === 'entrada' ? quantity : -quantity;
                const updateQuery = `
                    UPDATE products 
                    SET stock = stock + ?, updated_at = CURRENT_TIMESTAMP 
                    WHERE id = ?
                `;

                db.run(updateQuery, [stockChange, product_id], function(err) {
                    if (err) {
                        db.run('ROLLBACK');
                        return res.status(500).json({ error: err.message });
                    }

                    db.run('COMMIT');
                    res.json({ 
                        success: true,
                        message: `${type === 'entrada' ? 'Entrada' : 'Salida'} registrada exitosamente` 
                    });
                });
            });
        });
    }
});

// Obtener historial de movimientos
router.get('/movements/:productId?', (req, res) => {
    const { productId } = req.params;
    const { limit = 50 } = req.query;

    let query = `
        SELECT m.*, p.name as product_name, p.code as product_code
        FROM movements m
        JOIN products p ON m.product_id = p.id
    `;
    let params = [];

    if (productId) {
        query += ' WHERE m.product_id = ?';
        params.push(productId);
    }

    query += ' ORDER BY m.date DESC LIMIT ?';
    params.push(parseInt(limit));

    db.all(query, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Obtener productos con stock bajo
router.get('/low-stock', (req, res) => {
    const query = `
        SELECT p.*, c.name as category_name 
        FROM products p 
        JOIN categories c ON p.category_id = c.id 
        WHERE p.stock <= p.min_stock
        ORDER BY p.stock ASC
    `;

    db.all(query, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Calcular stock estimado basado en peso total para productos de pernería
router.post('/calculate-stock-by-weight', (req, res) => {
    const { product_id, total_weight } = req.body;

    if (!product_id || !total_weight || total_weight <= 0) {
        return res.status(400).json({ 
            error: 'ID del producto y peso total son requeridos' 
        });
    }

    // Obtener información del producto
    db.get(
        'SELECT * FROM products WHERE id = ? AND unit_type = "peso"', 
        [product_id], 
        (err, product) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            if (!product) {
                return res.status(404).json({ 
                    error: 'Producto no encontrado o no está configurado para manejo por peso' 
                });
            }

            if (!product.weight_per_unit || !product.units_per_weight_reference) {
                return res.status(400).json({ 
                    error: 'El producto no tiene configuración de peso válida' 
                });
            }

            // Calcular unidades estimadas
            const weightPerReference = product.weight_per_unit * product.units_per_weight_reference;
            const estimatedUnits = Math.round((total_weight / weightPerReference) * product.units_per_weight_reference);

            res.json({
                success: true,
                product_name: product.name,
                product_code: product.code,
                total_weight: total_weight,
                weight_per_unit: product.weight_per_unit,
                units_per_reference: product.units_per_weight_reference,
                weight_per_reference: weightPerReference,
                estimated_units: estimatedUnits,
                calculation_details: {
                    formula: `(${total_weight} kg / ${weightPerReference} kg) × ${product.units_per_weight_reference} unidades`,
                    description: `Cada ${product.units_per_weight_reference} unidades pesan aproximadamente ${weightPerReference} kg`
                }
            });
        }
    );
});

// Eliminar producto
router.delete('/products/:id', (req, res) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({ 
            error: 'ID del producto es requerido' 
        });
    }

    // Verificar si el producto existe
    db.get('SELECT * FROM products WHERE id = ?', [id], (err, product) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (!product) {
            return res.status(404).json({ 
                error: 'Producto no encontrado' 
            });
        }

        // Eliminar el producto y sus movimientos asociados
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');

            // Primero eliminar los movimientos asociados
            db.run('DELETE FROM movements WHERE product_id = ?', [id], (err) => {
                if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: err.message });
                }

                // Luego eliminar el producto
                db.run('DELETE FROM products WHERE id = ?', [id], function(err) {
                    if (err) {
                        db.run('ROLLBACK');
                        return res.status(500).json({ error: err.message });
                    }

                    if (this.changes === 0) {
                        db.run('ROLLBACK');
                        return res.status(404).json({ 
                            error: 'Producto no encontrado' 
                        });
                    }

                    db.run('COMMIT');
                    res.json({ 
                        success: true,
                        message: 'Producto eliminado exitosamente'
                    });
                });
            });
        });
    });
});

module.exports = router;
