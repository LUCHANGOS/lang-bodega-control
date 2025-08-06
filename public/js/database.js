// Sistema de base de datos local usando localStorage
class LocalDatabase {
    constructor() {
        this.initializeDatabase();
    }

    initializeDatabase() {
        // Inicializar inventario si no existe
        if (!localStorage.getItem('bodega_inventory')) {
            const inventory = [
                {
                    id: 1,
                    name: "Perno M8 x 20mm",
                    description: "Perno hexagonal métrico 8mm x 20mm, acero inoxidable",
                    category: "Pernos",
                    quantity: 150,
                    minStock: 20,
                    maxStock: 200,
                    location: "A1-B2",
                    price: 0.50,
                    supplier: "Ferretería Central",
                    dateAdded: "2024-01-15",
                    lastModified: new Date().toISOString()
                },
                {
                    id: 2,
                    name: "Tuerca M8",
                    description: "Tuerca hexagonal métrica 8mm, acero galvanizado",
                    category: "Tuercas",
                    quantity: 200,
                    minStock: 30,
                    maxStock: 300,
                    location: "A1-B3",
                    price: 0.25,
                    supplier: "Ferretería Central",
                    dateAdded: "2024-01-15",
                    lastModified: new Date().toISOString()
                },
                {
                    id: 3,
                    name: "Arandela M8",
                    description: "Arandela plana métrica 8mm, acero inoxidable",
                    category: "Arandelas",
                    quantity: 300,
                    minStock: 50,
                    maxStock: 400,
                    location: "A1-B4",
                    price: 0.10,
                    supplier: "Suministros Industriales",
                    dateAdded: "2024-01-16",
                    lastModified: new Date().toISOString()
                },
                {
                    id: 4,
                    name: "Tornillo Phillips M6 x 25mm",
                    description: "Tornillo cabeza Phillips, métrico 6mm x 25mm",
                    category: "Tornillos",
                    quantity: 100,
                    minStock: 15,
                    maxStock: 150,
                    location: "A2-B1",
                    price: 0.75,
                    supplier: "Tornillería Especializada",
                    dateAdded: "2024-01-17",
                    lastModified: new Date().toISOString()
                },
                {
                    id: 5,
                    name: "Cable Eléctrico 2.5mm",
                    description: "Cable eléctrico flexible 2.5mm², cobre, por metro",
                    category: "Cables",
                    quantity: 500,
                    minStock: 100,
                    maxStock: 1000,
                    location: "C1-A1",
                    price: 2.50,
                    supplier: "Eléctricos SA",
                    dateAdded: "2024-01-18",
                    lastModified: new Date().toISOString()
                }
            ];
            localStorage.setItem('bodega_inventory', JSON.stringify(inventory));
        }

        // Inicializar categorías
        if (!localStorage.getItem('bodega_categories')) {
            const categories = [
                "Pernos", "Tuercas", "Arandelas", "Tornillos", 
                "Cables", "Herramientas", "Materiales", "Otros"
            ];
            localStorage.setItem('bodega_categories', JSON.stringify(categories));
        }

        // Inicializar historial de movimientos
        if (!localStorage.getItem('bodega_movements')) {
            localStorage.setItem('bodega_movements', JSON.stringify([]));
        }

        // Inicializar proveedores
        if (!localStorage.getItem('bodega_suppliers')) {
            const suppliers = [
                "Ferretería Central", "Suministros Industriales", 
                "Tornillería Especializada", "Eléctricos SA", "Otros"
            ];
            localStorage.setItem('bodega_suppliers', JSON.stringify(suppliers));
        }
    }

    // Operaciones de inventario
    getInventory() {
        return JSON.parse(localStorage.getItem('bodega_inventory') || '[]');
    }

    saveInventory(inventory) {
        localStorage.setItem('bodega_inventory', JSON.stringify(inventory));
    }

    addProduct(product) {
        const inventory = this.getInventory();
        const newId = Math.max(...inventory.map(p => p.id), 0) + 1;
        
        const newProduct = {
            id: newId,
            ...product,
            dateAdded: new Date().toISOString(),
            lastModified: new Date().toISOString()
        };
        
        inventory.push(newProduct);
        this.saveInventory(inventory);
        
        // Registrar movimiento
        this.addMovement({
            productId: newId,
            productName: product.name,
            type: 'entrada',
            quantity: product.quantity,
            reason: 'Producto agregado al inventario',
            user: localStorage.getItem('username') || 'Sistema'
        });
        
        return newProduct;
    }

    updateProduct(id, updates) {
        const inventory = this.getInventory();
        const index = inventory.findIndex(p => p.id == id);
        
        if (index !== -1) {
            const oldQuantity = inventory[index].quantity;
            inventory[index] = {
                ...inventory[index],
                ...updates,
                lastModified: new Date().toISOString()
            };
            this.saveInventory(inventory);
            
            // Registrar movimiento si cambió la cantidad
            if (updates.quantity !== undefined && updates.quantity !== oldQuantity) {
                const difference = updates.quantity - oldQuantity;
                this.addMovement({
                    productId: id,
                    productName: inventory[index].name,
                    type: difference > 0 ? 'entrada' : 'salida',
                    quantity: Math.abs(difference),
                    reason: 'Actualización de inventario',
                    user: localStorage.getItem('username') || 'Sistema'
                });
            }
            
            return inventory[index];
        }
        return null;
    }

    deleteProduct(id) {
        const inventory = this.getInventory();
        const index = inventory.findIndex(p => p.id == id);
        
        if (index !== -1) {
            const product = inventory[index];
            inventory.splice(index, 1);
            this.saveInventory(inventory);
            
            // Registrar movimiento
            this.addMovement({
                productId: id,
                productName: product.name,
                type: 'salida',
                quantity: product.quantity,
                reason: 'Producto eliminado del inventario',
                user: localStorage.getItem('username') || 'Sistema'
            });
            
            return true;
        }
        return false;
    }

    getProduct(id) {
        const inventory = this.getInventory();
        return inventory.find(p => p.id == id) || null;
    }

    // Operaciones de movimientos
    getMovements() {
        return JSON.parse(localStorage.getItem('bodega_movements') || '[]');
    }

    addMovement(movement) {
        const movements = this.getMovements();
        const newMovement = {
            id: Date.now(),
            ...movement,
            date: new Date().toISOString()
        };
        movements.unshift(newMovement); // Agregar al inicio
        
        // Mantener solo los últimos 1000 movimientos
        if (movements.length > 1000) {
            movements.splice(1000);
        }
        
        localStorage.setItem('bodega_movements', JSON.stringify(movements));
        return newMovement;
    }

    // Operaciones de categorías y proveedores
    getCategories() {
        return JSON.parse(localStorage.getItem('bodega_categories') || '[]');
    }

    getSuppliers() {
        return JSON.parse(localStorage.getItem('bodega_suppliers') || '[]');
    }

    addCategory(category) {
        const categories = this.getCategories();
        if (!categories.includes(category)) {
            categories.push(category);
            localStorage.setItem('bodega_categories', JSON.stringify(categories));
        }
    }

    addSupplier(supplier) {
        const suppliers = this.getSuppliers();
        if (!suppliers.includes(supplier)) {
            suppliers.push(supplier);
            localStorage.setItem('bodega_suppliers', JSON.stringify(suppliers));
        }
    }

    // Búsqueda y filtros
    searchProducts(query) {
        const inventory = this.getInventory();
        const lowerQuery = query.toLowerCase();
        
        return inventory.filter(product => 
            product.name.toLowerCase().includes(lowerQuery) ||
            product.description.toLowerCase().includes(lowerQuery) ||
            product.category.toLowerCase().includes(lowerQuery) ||
            product.location.toLowerCase().includes(lowerQuery)
        );
    }

    getProductsByCategory(category) {
        const inventory = this.getInventory();
        return inventory.filter(product => product.category === category);
    }

    getLowStockProducts() {
        const inventory = this.getInventory();
        return inventory.filter(product => product.quantity <= product.minStock);
    }

    // Reportes
    getInventoryStats() {
        const inventory = this.getInventory();
        const movements = this.getMovements();
        
        return {
            totalProducts: inventory.length,
            totalValue: inventory.reduce((sum, p) => sum + (p.quantity * p.price), 0),
            lowStockItems: this.getLowStockProducts().length,
            recentMovements: movements.slice(0, 10),
            categoriesCount: this.getCategories().length,
            totalQuantity: inventory.reduce((sum, p) => sum + p.quantity, 0)
        };
    }

    // Exportar/Importar datos
    exportData() {
        return {
            inventory: this.getInventory(),
            movements: this.getMovements(),
            categories: this.getCategories(),
            suppliers: this.getSuppliers(),
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
    }

    importData(data) {
        if (data.inventory) localStorage.setItem('bodega_inventory', JSON.stringify(data.inventory));
        if (data.movements) localStorage.setItem('bodega_movements', JSON.stringify(data.movements));
        if (data.categories) localStorage.setItem('bodega_categories', JSON.stringify(data.categories));
        if (data.suppliers) localStorage.setItem('bodega_suppliers', JSON.stringify(data.suppliers));
    }
}

// Instancia global de la base de datos
window.localDB = new LocalDatabase();
