// Manejador de formularios para agregar productos
document.addEventListener('DOMContentLoaded', () => {
    // Cargar categorías en el select del formulario
    const loadCategoriesInForm = () => {
        const categorySelect = document.getElementById('productCategory');
        if (categorySelect && window.localDB) {
            const categories = localDB.getCategories();
            
            // Limpiar opciones existentes (excepto la primera)
            while (categorySelect.children.length > 1) {
                categorySelect.removeChild(categorySelect.lastChild);
            }
            
            // Agregar categorías
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                categorySelect.appendChild(option);
            });
        }
    };

    // Manejar el formulario de agregar producto
    const addProductForm = document.getElementById('addProductForm');
    if (addProductForm) {
        addProductForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const formData = new FormData(addProductForm);
            const productData = {
                name: formData.get('name') || document.getElementById('productName').value,
                description: formData.get('description') || document.getElementById('productDescription').value,
                category: formData.get('category_id') || document.getElementById('productCategory').value,
                quantity: parseInt(formData.get('stock') || document.getElementById('initialStock').value) || 0,
                minStock: parseInt(formData.get('min_stock') || document.getElementById('minStock').value) || 5,
                maxStock: parseInt(formData.get('min_stock') || document.getElementById('minStock').value) * 5 || 25,
                location: `${document.getElementById('productCategory').value.charAt(0)}-A1-B1`,
                price: Math.random() * 20 + 5, // Precio aleatorio para ejemplo
                supplier: 'Proveedor Industrial'
            };

            if (!productData.name || !productData.category) {
                alert('Por favor completa todos los campos obligatorios');
                return;
            }

            try {
                const newProduct = localDB.addProduct(productData);
                alert(`Producto "${productData.name}" agregado exitosamente con código LANG-${newProduct.id.toString().padStart(4, '0')}`);
                
                // Limpiar formulario
                addProductForm.reset();
                
                // Recargar productos si estamos en la sección de inventario
                if (typeof loadProducts === 'function') {
                    loadProducts();
                }
                if (typeof loadLowStock === 'function') {
                    loadLowStock();
                }
            } catch (error) {
                console.error('Error al agregar producto:', error);
                alert('Error al agregar el producto');
            }
        });
    }

    // Inicializar cuando se carga la base de datos
    setTimeout(loadCategoriesInForm, 500);
    
    // También cargar cuando se cambia a la sección de agregar producto
    const navButtons = document.querySelectorAll('.nav-btn[data-section="add-product"]');
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            setTimeout(loadCategoriesInForm, 100);
        });
    });
});

// Exponer función globalmente
window.loadCategoriesInForm = () => {
    const categorySelect = document.getElementById('productCategory');
    if (categorySelect && window.localDB) {
        const categories = localDB.getCategories();
        
        while (categorySelect.children.length > 1) {
            categorySelect.removeChild(categorySelect.lastChild);
        }
        
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categorySelect.appendChild(option);
        });
    }
};
