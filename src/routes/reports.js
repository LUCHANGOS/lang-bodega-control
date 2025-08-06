const express = require('express');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { db } = require('../models/database');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Aplicar autenticación a todas las rutas de reportes
router.use(authenticateToken);

// Función para generar fecha formateada
const formatDate = (date) => {
    return new Date(date).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

// Generar reporte de inventario completo
router.get('/inventory-full', (req, res) => {
    const query = `
        SELECT p.*, c.name as category_name 
        FROM products p 
        JOIN categories c ON p.category_id = c.id 
        ORDER BY c.name, p.name
    `;

    db.all(query, (err, products) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Crear PDF
        const doc = new PDFDocument({ margin: 50 });
        const filename = `inventario_completo_${new Date().toISOString().split('T')[0]}.pdf`;
        const filepath = path.join(__dirname, '../../reports', filename);

        // Configurar stream de escritura
        doc.pipe(fs.createWriteStream(filepath));
        doc.pipe(res);

        // Encabezado del documento
        doc.fontSize(20).text('SATTEL CHILE®', { align: 'center' });
        doc.fontSize(16).text('REPORTE DE INVENTARIO COMPLETO', { align: 'center' });
        doc.fontSize(12).text(`Fecha: ${formatDate(new Date())}`, { align: 'center' });
        doc.moveDown(2);

        // Agrupar productos por categoría
        const categories = {};
        products.forEach(product => {
            if (!categories[product.category_name]) {
                categories[product.category_name] = [];
            }
            categories[product.category_name].push(product);
        });

        // Generar contenido por categoría
        Object.keys(categories).forEach(categoryName => {
            doc.fontSize(14).text(categoryName.toUpperCase(), { underline: true });
            doc.moveDown(0.5);

            categories[categoryName].forEach(product => {
                const stockColor = product.stock <= product.min_stock ? 'red' : 'black';
                
                doc.fontSize(10)
                   .text(`Código: ${product.code}`, { continued: true })
                   .text(`    Stock: ${product.stock}`, { align: 'right', fillColor: stockColor });
                
                doc.text(`Producto: ${product.name}`);
                if (product.description) {
                    doc.text(`Descripción: ${product.description}`);
                }
                doc.moveDown(0.3);
            });
            
            doc.moveDown(1);
        });

        // Pie de página
        doc.fontSize(8)
           .text('_'.repeat(80), { align: 'center' })
           .text('SATTEL CHILE® - Sistema de Control de Bodega', { align: 'center' })
           .text(`Generado el ${new Date().toLocaleString('es-ES')}`, { align: 'center' });

        doc.end();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    });
});

// Generar reporte de movimientos diarios
router.get('/daily-movements', (req, res) => {
    const { date } = req.query;
    const reportDate = date ? new Date(date) : new Date();
    const dateStr = reportDate.toISOString().split('T')[0];

    const query = `
        SELECT m.*, p.name as product_name, p.code as product_code, c.name as category_name
        FROM movements m
        JOIN products p ON m.product_id = p.id
        JOIN categories c ON p.category_id = c.id
        WHERE DATE(m.date) = ?
        ORDER BY m.date DESC
    `;

    db.all(query, [dateStr], (err, movements) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Crear PDF
        const doc = new PDFDocument({ margin: 50 });
        const filename = `movimientos_diarios_${dateStr}.pdf`;
        const filepath = path.join(__dirname, '../../reports', filename);

        // Configurar stream de escritura
        doc.pipe(fs.createWriteStream(filepath));
        doc.pipe(res);

        // Encabezado del documento
        doc.fontSize(20).text('SATTEL CHILE®', { align: 'center' });
        doc.fontSize(16).text('REPORTE DE MOVIMIENTOS DIARIOS', { align: 'center' });
        doc.fontSize(12).text(`Fecha: ${formatDate(reportDate)}`, { align: 'center' });
        doc.moveDown(2);

        if (movements.length === 0) {
            doc.fontSize(12).text('No se registraron movimientos en esta fecha.', { align: 'center' });
        } else {
            // Separar entradas y salidas
            const entradas = movements.filter(m => m.type === 'entrada');
            const salidas = movements.filter(m => m.type === 'salida');

            // Mostrar entradas
            if (entradas.length > 0) {
                doc.fontSize(14).text('ENTRADAS', { underline: true, fillColor: 'green' });
                doc.moveDown(0.5);

                entradas.forEach(movement => {
                    doc.fontSize(10)
                       .fillColor('black')
                       .text(`${movement.product_code} - ${movement.product_name}`)
                       .text(`Cantidad: +${movement.quantity} | Responsable: ${movement.responsible}`)
                       .text(`Motivo: ${movement.reason || 'N/A'}`)
                       .text(`Hora: ${new Date(movement.date).toLocaleTimeString('es-ES')}`)
                       .moveDown(0.3);
                });
                doc.moveDown(1);
            }

            // Mostrar salidas
            if (salidas.length > 0) {
                doc.fontSize(14).text('SALIDAS', { underline: true, fillColor: 'red' });
                doc.moveDown(0.5);

                salidas.forEach(movement => {
                    doc.fontSize(10)
                       .fillColor('black')
                       .text(`${movement.product_code} - ${movement.product_name}`)
                       .text(`Cantidad: -${movement.quantity} | Responsable: ${movement.responsible}`)
                       .text(`Motivo: ${movement.reason || 'N/A'}`)
                       .text(`Hora: ${new Date(movement.date).toLocaleTimeString('es-ES')}`)
                       .moveDown(0.3);
                });
            }

            // Resumen
            doc.moveDown(1);
            doc.fontSize(12)
               .text('RESUMEN DEL DÍA', { underline: true })
               .text(`Total de entradas: ${entradas.length}`)
               .text(`Total de salidas: ${salidas.length}`)
               .text(`Total de movimientos: ${movements.length}`);
        }

        // Pie de página
        doc.moveDown(2);
        doc.fontSize(8)
           .text('_'.repeat(80), { align: 'center' })
           .text('L.A.N.G. - Sistema de Control de Bodega', { align: 'center' })
           .text(`Generado el ${new Date().toLocaleString('es-ES')}`, { align: 'center' });

        doc.end();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    });
});

// Generar reporte de stock bajo
router.get('/low-stock', (req, res) => {
    const query = `
        SELECT p.*, c.name as category_name 
        FROM products p 
        JOIN categories c ON p.category_id = c.id 
        WHERE p.stock <= p.min_stock
        ORDER BY p.stock ASC, c.name, p.name
    `;

    db.all(query, (err, products) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Crear PDF
        const doc = new PDFDocument({ margin: 50 });
        const filename = `stock_bajo_${new Date().toISOString().split('T')[0]}.pdf`;
        const filepath = path.join(__dirname, '../../reports', filename);

        // Configurar stream de escritura
        doc.pipe(fs.createWriteStream(filepath));
        doc.pipe(res);

        // Encabezado del documento
        doc.fontSize(20).text('L.A.N.G.', { align: 'center' });
        doc.fontSize(16).text('REPORTE DE STOCK BAJO', { align: 'center', fillColor: 'red' });
        doc.fontSize(12).fillColor('black').text(`Fecha: ${formatDate(new Date())}`, { align: 'center' });
        doc.moveDown(2);

        if (products.length === 0) {
            doc.fontSize(12).text('✅ Todos los productos tienen stock suficiente.', { align: 'center', fillColor: 'green' });
        } else {
            doc.fontSize(14).fillColor('red').text(`⚠️ ${products.length} PRODUCTOS CON STOCK BAJO`, { underline: true });
            doc.moveDown(1);

            products.forEach(product => {
                const criticalStock = product.stock === 0;
                const textColor = criticalStock ? 'red' : 'orange';
                
                doc.fontSize(12)
                   .fillColor(textColor)
                   .text(`${criticalStock ? '🔴' : '🟡'} ${product.code} - ${product.name}`, { underline: criticalStock })
                   .fillColor('black')
                   .fontSize(10)
                   .text(`Categoría: ${product.category_name}`)
                   .text(`Stock actual: ${product.stock} | Stock mínimo: ${product.min_stock}`)
                   .text(`Estado: ${criticalStock ? 'AGOTADO' : 'STOCK BAJO'}`)
                   .moveDown(0.5);
            });

            // Recomendaciones
            doc.moveDown(1);
            doc.fontSize(12)
               .fillColor('blue')
               .text('RECOMENDACIONES:', { underline: true })
               .fillColor('black')
               .fontSize(10)
               .text('• Revisar y reabastecer los productos marcados en rojo urgentemente')
               .text('• Planificar compras para los productos marcados en amarillo')
               .text('• Considerar ajustar los niveles mínimos de stock si es necesario');
        }

        // Pie de página
        doc.moveDown(2);
        doc.fontSize(8)
           .fillColor('black')
           .text('_'.repeat(80), { align: 'center' })
           .text('L.A.N.G. - Sistema de Control de Bodega', { align: 'center' })
           .text(`Generado el ${new Date().toLocaleString('es-ES')}`, { align: 'center' });

        doc.end();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    });
});

module.exports = router;
