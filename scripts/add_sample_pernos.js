const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../config/bodega.db');

// Conectar a la base de datos
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error conectando a la base de datos:', err.message);
        return;
    }
    console.log('✅ Conectado a la base de datos SQLite');
});

// Productos de pernería de ejemplo con datos de peso
const samplePernos = [
    {
        code: 'PERN001',
        name: 'Tornillo Allen M6x20',
        description: 'Tornillo Allen hexagonal de 6mm x 20mm, acero galvanizado',
        unit_type: 'peso',
        weight_per_unit: 0.008, // 8 gramos por unidad
        units_per_weight_reference: 10,
        stock: 250,
        min_stock: 50
    },
    {
        code: 'PERN002', 
        name: 'Tornillo Phillips M4x16',
        description: 'Tornillo Phillips cabeza cilíndrica M4x16mm',
        unit_type: 'peso',
        weight_per_unit: 0.003, // 3 gramos por unidad
        units_per_weight_reference: 20,
        stock: 500,
        min_stock: 100
    },
    {
        code: 'PERN003',
        name: 'Tuerca Hexagonal M6',
        description: 'Tuerca hexagonal M6, acero inoxidable',
        unit_type: 'peso',
        weight_per_unit: 0.005, // 5 gramos por unidad
        units_per_weight_reference: 10,
        stock: 300,
        min_stock: 50
    },
    {
        code: 'PERN004',
        name: 'Arandela Plana M6',
        description: 'Arandela plana DIN 125, diámetro 6mm',
        unit_type: 'peso',
        weight_per_unit: 0.001, // 1 gramo por unidad
        units_per_weight_reference: 50,
        stock: 1000,
        min_stock: 200
    },
    {
        code: 'PERN005',
        name: 'Perno Hexagonal M8x40',
        description: 'Perno hexagonal M8x40mm con rosca completa',
        unit_type: 'peso',
        weight_per_unit: 0.025, // 25 gramos por unidad
        units_per_weight_reference: 10,
        stock: 150,
        min_stock: 30
    }
];

function addSamplePernos() {
    // Primero obtener el ID de la categoría "Pernería"
    db.get('SELECT id FROM categories WHERE name = ?', ['Pernería'], (err, row) => {
        if (err) {
            console.error('❌ Error obteniendo categoría:', err.message);
            return;
        }

        if (!row) {
            console.error('❌ No se encontró la categoría "Pernería"');
            return;
        }

        const perneriaId = row.id;
        console.log(`✅ Categoría "Pernería" encontrada con ID: ${perneriaId}`);

        // Insertar productos de pernería
        const insertQuery = `
            INSERT OR REPLACE INTO products (
                code, name, description, category_id, stock, min_stock,
                unit_type, weight_per_unit, units_per_weight_reference
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        samplePernos.forEach((perno, index) => {
            db.run(
                insertQuery,
                [
                    perno.code,
                    perno.name,
                    perno.description,
                    perneriaId,
                    perno.stock,
                    perno.min_stock,
                    perno.unit_type,
                    perno.weight_per_unit,
                    perno.units_per_weight_reference
                ],
                function(err) {
                    if (err) {
                        console.error(`❌ Error insertando ${perno.name}:`, err.message);
                    } else {
                        console.log(`✅ Agregado: ${perno.name} (${perno.code})`);
                        console.log(`   - Peso por unidad: ${perno.weight_per_unit}kg`);
                        console.log(`   - Referencia: ${perno.units_per_weight_reference} unidades`);
                        console.log(`   - Stock: ${perno.stock} unidades`);
                    }

                    // Cerrar conexión después del último elemento
                    if (index === samplePernos.length - 1) {
                        setTimeout(() => {
                            db.close((err) => {
                                if (err) {
                                    console.error('❌ Error cerrando la base de datos:', err.message);
                                } else {
                                    console.log('✅ Conexión a base de datos cerrada');
                                    console.log('\n🎉 ¡Productos de pernería agregados exitosamente!');
                                    console.log('\n📝 Puedes probar la calculadora de peso con estos valores:');
                                    console.log('   - Tornillo Allen M6x20: 10 unidades = 0.08kg');
                                    console.log('   - Tuerca M6: 10 unidades = 0.05kg');
                                    console.log('   - Arandela M6: 50 unidades = 0.05kg');
                                }
                            });
                        }, 100);
                    }
                }
            );
        });
    });
}

// Ejecutar la función
addSamplePernos();
