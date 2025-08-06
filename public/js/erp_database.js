// Sistema ERP de Base de Datos para Bodega L.A.N.G.
class ERPDatabase {
    constructor() {
        this.version = '2.0.0';
    }
    
    static async init() {
        console.log('🔧 Inicializando ERP Database...');
        const instance = new ERPDatabase();
        await instance.initializeDatabase();
        return instance;
    }

    initializeDatabase() {
        // Forzar actualización a ERP
        this.clearOldData();
        
        // Inicializar productos con códigos de barras
        if (!localStorage.getItem('erp_products')) {
            const products = [
                {
                    id: 1,
                    code: 'LANG-0001',
                    barcode: '7891234567890',
                    name: 'Perno Hexagonal M8 x 20mm',
                    description: 'Perno hexagonal métrico 8x20mm, acero galvanizado, grado 8.8',
                    category: 'Mecánica (Pernería/Fierros)',
                    subcategory: 'Pernos',
                    unit: 'unidad',
                    currentStock: 150,
                    minStock: 20,
                    maxStock: 200,
                    location: 'Estante A3-Pasillo 2',
                    supplier: 'Distribuidora Industrial',
                    dateAdded: new Date().toISOString(),
                    lastModified: new Date().toISOString(),
                    isActive: true
                },
                {
                    id: 2,
                    code: 'LANG-0002',
                    barcode: '7891234567891',
                    name: 'Cable THW 12 AWG',
                    description: 'Cable eléctrico THW calibre 12 AWG, 600V, cobre',
                    category: 'Electricidad',
                    subcategory: 'Cables',
                    unit: 'metro',
                    currentStock: 500,
                    minStock: 100,
                    maxStock: 1000,
                    location: 'Estante E1-Pasillo 1',
                    supplier: 'Eléctrica Industrial',
                    dateAdded: new Date().toISOString(),
                    lastModified: new Date().toISOString(),
                    isActive: true
                },
                {
                    id: 3,
                    code: 'LANG-0003',
                    barcode: '7891234567892',
                    name: 'Electrodo E6013 1/8"',
                    description: 'Electrodo para soldadura E6013 diámetro 1/8", multipropósito',
                    category: 'Soldadura',
                    subcategory: 'Electrodos',
                    unit: 'kilo',
                    currentStock: 25,
                    minStock: 5,
                    maxStock: 50,
                    location: 'Estante S2-Pasillo 3',
                    supplier: 'Soldaduras Técnicas',
                    dateAdded: new Date().toISOString(),
                    lastModified: new Date().toISOString(),
                    isActive: true
                },
                {
                    id: 4,
                    code: 'LANG-0004',
                    barcode: '7891234567893',
                    name: 'Pintura Anticorrosiva Roja',
                    description: 'Pintura anticorrosiva base agua, color rojo óxido',
                    category: 'Pintura',
                    subcategory: 'Anticorrosivos',
                    unit: 'litro',
                    currentStock: 48,
                    minStock: 10,
                    maxStock: 100,
                    location: 'Estante P1-Pasillo 4',
                    supplier: 'Pinturas Industriales',
                    dateAdded: new Date().toISOString(),
                    lastModified: new Date().toISOString(),
                    isActive: true
                },
                {
                    id: 5,
                    code: 'LANG-0005',
                    barcode: '7891234567894',
                    name: 'Casco de Seguridad Blanco',
                    description: 'Casco de seguridad industrial, polietileno, blanco, clase G',
                    category: 'EPP',
                    subcategory: 'Protección Cabeza',
                    unit: 'unidad',
                    currentStock: 25,
                    minStock: 5,
                    maxStock: 50,
                    location: 'Estante EPP-A1',
                    supplier: 'Seguridad Industrial',
                    dateAdded: new Date().toISOString(),
                    lastModified: new Date().toISOString(),
                    isActive: true
                }
            ];
            localStorage.setItem('erp_products', JSON.stringify(products));
        }

        // Inicializar proyectos
        if (!localStorage.getItem('erp_projects')) {
            const projects = [
                {
                    id: 1,
                    projectNumber: 'OT-2025-001',
                    name: 'Mantenimiento Planta Norte',
                    ceco: 'MANT-001',
                    responsible: 'Juan Pérez',
                    status: 'Activo',
                    startDate: '2025-01-01',
                    endDate: '2025-03-31',
                    description: 'Mantenimiento preventivo equipos planta norte',
                    createdBy: 'admin',
                    createdDate: new Date().toISOString()
                },
                {
                    id: 2,
                    projectNumber: 'OP-2025-002',
                    name: 'Instalación Eléctrica Sector B',
                    ceco: 'ELEC-002',
                    responsible: 'María González',
                    status: 'Activo',
                    startDate: '2025-01-15',
                    endDate: '2025-02-28',
                    description: 'Nueva instalación eléctrica para ampliación',
                    createdBy: 'admin',
                    createdDate: new Date().toISOString()
                }
            ];
            localStorage.setItem('erp_projects', JSON.stringify(projects));
        }

        // Inicializar movimientos
        if (!localStorage.getItem('erp_movements')) {
            localStorage.setItem('erp_movements', JSON.stringify([]));
        }

        // Inicializar recetas
        if (!localStorage.getItem('erp_recipes')) {
            localStorage.setItem('erp_recipes', JSON.stringify([]));
        }

        // Inicializar vales de retiro
        if (!localStorage.getItem('erp_withdrawal_vouchers')) {
            localStorage.setItem('erp_withdrawal_vouchers', JSON.stringify([]));
        }

        // Inicializar categorías ERP
        if (!localStorage.getItem('erp_categories')) {
            const categories = {
                'Electricidad': ['Cables', 'Interruptores', 'Transformadores', 'Conectores', 'Luminarias'],
                'Soldadura': ['Electrodos', 'Gases', 'Alambre', 'Consumibles', 'Equipos'],
                'Mecánica (Pernería/Fierros)': ['Pernos', 'Tuercas', 'Arandelas', 'Varillas', 'Perfiles'],
                'Pintura': ['Anticorrosivos', 'Esmaltes', 'Primers', 'Diluyentes', 'Brochas'],
                'EPP': ['Protección Cabeza', 'Protección Manos', 'Protección Pies', 'Protección Respiratoria', 'Arneses'],
                'Herramientas': ['Manuales', 'Eléctricas', 'Neumáticas', 'Medición', 'Corte'],
                'Lubricantes': ['Aceites', 'Grasas', 'Fluidos Hidráulicos', 'Refrigerantes', 'Limpiadores'],
                'Instrumentos': ['Medición', 'Calibración', 'Control', 'Monitoreo', 'Análisis']
            };
            localStorage.setItem('erp_categories', JSON.stringify(categories));
        }

        // Inicializar unidades de medida
        if (!localStorage.getItem('erp_units')) {
            const units = [
                'unidad', 'metro', 'kilo', 'litro', 'gramo', 'tonelada',
                'galón', 'pulgada', 'pie', 'yarda', 'onza', 'libra',
                'centímetro', 'milímetro', 'kilómetro', 'metro cuadrado',
                'metro cúbico', 'paquete', 'caja', 'rollo', 'barra', 'plancha'
            ];
            localStorage.setItem('erp_units', JSON.stringify(units));
        }

        // Inicializar proveedores
        if (!localStorage.getItem('erp_suppliers')) {
            const suppliers = [
                'Distribuidora Industrial',
                'Eléctrica Industrial',
                'Soldaduras Técnicas',
                'Pinturas Industriales',
                'Seguridad Industrial',
                'Ferretería Central',
                'Suministros Técnicos',
                'Importadora L&M'
            ];
            localStorage.setItem('erp_suppliers', JSON.stringify(suppliers));
        }

        console.log('✅ Base de datos ERP inicializada correctamente');
    }

    clearOldData() {
        // Limpiar datos del sistema anterior
        const oldKeys = [
            'bodega_users', 'bodega_categories', 'bodega_inventory',
            'bodega_movements', 'bodega_suppliers'
        ];
        oldKeys.forEach(key => localStorage.removeItem(key));
    }

    // === OPERACIONES DE PRODUCTOS ===
    getProducts() {
        return JSON.parse(localStorage.getItem('erp_products') || '[]');
    }

    saveProducts(products) {
        localStorage.setItem('erp_products', JSON.stringify(products));
    }

    getProductByCode(code) {
        const products = this.getProducts();
        return products.find(p => p.code === code || p.barcode === code);
    }

    getProductById(id) {
        const products = this.getProducts();
        return products.find(p => p.id == id);
    }

    searchProducts(query) {
        const products = this.getProducts();
        const lowerQuery = query.toLowerCase();
        return products.filter(product => 
            product.name.toLowerCase().includes(lowerQuery) ||
            product.code.toLowerCase().includes(lowerQuery) ||
            product.barcode.includes(query) ||
            product.description.toLowerCase().includes(lowerQuery) ||
            product.location.toLowerCase().includes(lowerQuery)
        );
    }

    getLowStockProducts() {
        const products = this.getProducts();
        return products.filter(product => product.currentStock <= product.minStock);
    }

    addProduct(productData) {
        const products = this.getProducts();
        const newId = Math.max(...products.map(p => p.id), 0) + 1;
        const newCode = `LANG-${newId.toString().padStart(4, '0')}`;
        
        const newProduct = {
            id: newId,
            code: newCode,
            ...productData,
            dateAdded: new Date().toISOString(),
            lastModified: new Date().toISOString(),
            isActive: true
        };
        
        products.push(newProduct);
        this.saveProducts(products);
        
        // Registrar movimiento inicial
        if (productData.currentStock > 0) {
            this.addMovement({
                type: 'entrada',
                productId: newId,
                quantity: productData.currentStock,
                reason: 'Stock inicial del producto',
                user: localStorage.getItem('username') || 'Sistema'
            });
        }
        
        return newProduct;
    }

    updateProduct(id, updates) {
        const products = this.getProducts();
        const index = products.findIndex(p => p.id == id);
        
        if (index !== -1) {
            const oldStock = products[index].currentStock;
            products[index] = {
                ...products[index],
                ...updates,
                lastModified: new Date().toISOString()
            };
            this.saveProducts(products);
            
            // Registrar movimiento si cambió el stock
            if (updates.currentStock !== undefined && updates.currentStock !== oldStock) {
                const difference = updates.currentStock - oldStock;
                this.addMovement({
                    type: difference > 0 ? 'entrada' : 'salida',
                    productId: id,
                    quantity: Math.abs(difference),
                    reason: 'Ajuste de inventario',
                    user: localStorage.getItem('username') || 'Sistema'
                });
            }
            
            return products[index];
        }
        return null;
    }

    // === OPERACIONES DE PROYECTOS ===
    getProjects() {
        return JSON.parse(localStorage.getItem('erp_projects') || '[]');
    }

    saveProjects(projects) {
        localStorage.setItem('erp_projects', JSON.stringify(projects));
    }

    addProject(projectData) {
        const projects = this.getProjects();
        const newId = Math.max(...projects.map(p => p.id), 0) + 1;
        
        const newProject = {
            id: newId,
            ...projectData,
            createdDate: new Date().toISOString(),
            createdBy: localStorage.getItem('username') || 'Sistema'
        };
        
        projects.push(newProject);
        this.saveProjects(projects);
        return newProject;
    }

    getActiveProjects() {
        const projects = this.getProjects();
        return projects.filter(p => p.status === 'Activo');
    }

    // === OPERACIONES DE MOVIMIENTOS ===
    getMovements() {
        return JSON.parse(localStorage.getItem('erp_movements') || '[]');
    }

    saveMovements(movements) {
        localStorage.setItem('erp_movements', JSON.stringify(movements));
    }

    addMovement(movementData) {
        const movements = this.getMovements();
        const newMovement = {
            id: Date.now(),
            date: new Date().toISOString(),
            ...movementData
        };
        
        movements.unshift(newMovement);
        
        // Mantener solo los últimos 5000 movimientos
        if (movements.length > 5000) {
            movements.splice(5000);
        }
        
        this.saveMovements(movements);
        return newMovement;
    }

    getMovementsByProject(projectId) {
        const movements = this.getMovements();
        return movements.filter(m => m.projectId == projectId);
    }

    getKardexByProduct(productId) {
        const movements = this.getMovements();
        const productMovements = movements.filter(m => m.productId == productId);
        const product = this.getProductById(productId);
        
        let runningBalance = 0;
        const kardex = productMovements.reverse().map(movement => {
            if (movement.type === 'entrada') {
                runningBalance += movement.quantity;
            } else {
                runningBalance -= movement.quantity;
            }
            
            return {
                ...movement,
                balance: runningBalance,
                product: product
            };
        });
        
        return kardex.reverse();
    }

    // === OPERACIONES DE RECETAS ===
    getRecipes() {
        return JSON.parse(localStorage.getItem('erp_recipes') || '[]');
    }

    saveRecipes(recipes) {
        localStorage.setItem('erp_recipes', JSON.stringify(recipes));
    }

    addRecipe(recipeData) {
        const recipes = this.getRecipes();
        const newRecipe = {
            id: Date.now(),
            createdDate: new Date().toISOString(),
            createdBy: localStorage.getItem('username') || 'Sistema',
            ...recipeData
        };
        
        recipes.push(newRecipe);
        this.saveRecipes(recipes);
        return newRecipe;
    }

    // === OPERACIONES DE VALES DE RETIRO ===
    getWithdrawalVouchers() {
        return JSON.parse(localStorage.getItem('erp_withdrawal_vouchers') || '[]');
    }

    saveWithdrawalVouchers(vouchers) {
        localStorage.setItem('erp_withdrawal_vouchers', JSON.stringify(vouchers));
    }

    createWithdrawalVoucher(voucherData) {
        const vouchers = this.getWithdrawalVouchers();
        const newVoucher = {
            id: Date.now(),
            voucherNumber: `VR-${new Date().getFullYear()}-${(vouchers.length + 1).toString().padStart(4, '0')}`,
            createdDate: new Date().toISOString(),
            createdBy: localStorage.getItem('username') || 'Sistema',
            status: 'Pendiente',
            ...voucherData
        };
        
        vouchers.push(newVoucher);
        this.saveWithdrawalVouchers(vouchers);
        return newVoucher;
    }

    // === ESTADÍSTICAS Y REPORTES ===
    getDashboardStats() {
        const products = this.getProducts();
        const movements = this.getMovements();
        const projects = this.getProjects();
        const lowStockProducts = this.getLowStockProducts();
        
        const today = new Date();
        const thisMonth = movements.filter(m => {
            const moveDate = new Date(m.date);
            return moveDate.getMonth() === today.getMonth() && 
                   moveDate.getFullYear() === today.getFullYear();
        });
        
        const exitMovements = thisMonth.filter(m => m.type === 'salida');
        const entryMovements = thisMonth.filter(m => m.type === 'entrada');
        
        return {
            totalProducts: products.length,
            activeProducts: products.filter(p => p.isActive).length,
            lowStockItems: lowStockProducts.length,
            totalMovements: movements.length,
            monthlyExits: exitMovements.length,
            monthlyEntries: entryMovements.length,
            activeProjects: projects.filter(p => p.status === 'Activo').length,
            totalProjects: projects.length,
            totalStock: products.reduce((sum, p) => sum + p.currentStock, 0)
        };
    }

    // === OPERACIONES AUXILIARES ===
    getCategories() {
        return JSON.parse(localStorage.getItem('erp_categories') || '{}');
    }

    getUnits() {
        return JSON.parse(localStorage.getItem('erp_units') || '[]');
    }

    getSuppliers() {
        return JSON.parse(localStorage.getItem('erp_suppliers') || '[]');
    }

    // Búsqueda por código de barras (para pistola USB)
    searchByBarcode(barcode) {
        const products = this.getProducts();
        return products.find(p => p.barcode === barcode);
    }
}

// Instancia global del ERP
window.erpDB = new ERPDatabase();
