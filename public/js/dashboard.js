document.addEventListener('DOMContentLoaded', () => {
    // Mostrar información del usuario al cargar
    const usernameDisplay = document.getElementById('username');
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo && usernameDisplay) {
        const user = JSON.parse(userInfo);
        usernameDisplay.textContent = user.fullName || user.username;
        
        // Agregar indicador de rol si es administrador
        if (user.role === 'admin') {
            usernameDisplay.innerHTML += ' <i class="fas fa-crown" title="Administrador" style="color: #f39c12; margin-left: 0.5rem;"></i>';
        }
    }
    const sections = {
        'inventory': document.getElementById('inventory-section'),
        'movements': document.getElementById('movements-section'),
        'reports': document.getElementById('reports-section'),
        'add-product': document.getElementById('add-product-section')
    };
    
    const navButtons = document.querySelectorAll('.nav-btn');
    const searchInput = document.getElementById('searchInput');
    const productsTableBody = document.getElementById('productsTableBody');
    const categoriesButtons = document.getElementById('categoriesButtons');
    const lowStockAlert = document.getElementById('lowStockAlert');
    const viewLowStock = document.getElementById('viewLowStock');
    const stockModal = document.getElementById('stockModal');
    const stockMovementForm = document.getElementById('stockMovementForm');
    const lowStockModal = document.getElementById('lowStockModal');
    const lowStockList = document.getElementById('lowStockList');
  
    let activeSection = 'inventory';

    const displaySection = (sectionName) => {
        // Ocultar todas las secciones
        Object.values(sections).forEach(section => {
            if (section) section.classList.remove('active');
        });
        
        // Mostrar la sección seleccionada
        if (sections[sectionName]) {
            sections[sectionName].classList.add('active');
            activeSection = sectionName;
        }
    };

    navButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionName = button.dataset.section;
            
            displaySection(sectionName);

            // Actualizar botones activos
            navButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Cargar datos específicos de cada sección
            if (sectionName === 'movements') {
                loadMovements();
            } else if (sectionName === 'inventory') {
                loadProducts();
                loadLowStock();
            }
        });
    });

    const loadCategories = async () => {
        const response = await fetch('/api/inventory/categories', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const categories = await response.json();

        // Agregar evento al botón "Todas"
        const allButton = document.querySelector('.filter-btn[data-category="all"]');
        if (allButton) {
            allButton.addEventListener('click', () => {
                loadProducts();
                document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
                allButton.classList.add('active');
            });
        }

        categories.forEach(category => {
            const button = document.createElement('button');
            button.className = 'filter-btn';
            button.dataset.category = category.id;
            button.textContent = category.name;
            button.addEventListener('click', () => {
                filterProductsByCategory(category.id);

                document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
            });
            categoriesButtons.appendChild(button);
        });
    };

    const loadProducts = async () => {
        const search = searchInput.value;
        const response = await fetch(`/api/inventory/products?search=${encodeURIComponent(search)}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const products = await response.json();

        productsTableBody.innerHTML = '';
        products.forEach(product => {
            const row = document.createElement('tr');
            const stockClass = product.stock <= product.min_stock ? 'low-stock' : '';

            row.innerHTML = `
                <td>${product.code}</td>
                <td>${product.name}</td>
                <td>${product.category_name}</td>
                <td>${product.stock}</td>
                <td><span class="${stockClass}">${product.stock <= product.min_stock ? 'Bajo' : 'Ok'}</span></td>
                <td>
                    <button class="action-btn" onclick="openMovementModal(${product.id}, 'entrada', '${product.name}')">Agregar Stock</button>
                    <button class="action-btn" onclick="openMovementModal(${product.id}, 'salida', '${product.name}')">Retirar Stock</button>
                    <button class="action-btn" style="background-color: #e74c3c;" onclick="deleteProduct(${product.id}, '${product.name}')">Eliminar</button>
                </td>
            `;

            productsTableBody.appendChild(row);
        });
    };

    const filterProductsByCategory = async (categoryId) => {
        const response = await fetch(`/api/inventory/products/${categoryId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const products = await response.json();

        productsTableBody.innerHTML = '';
        products.forEach(product => {
            const row = document.createElement('tr');
            const stockClass = product.stock <= product.min_stock ? 'low-stock' : '';

            row.innerHTML = `
                <td>${product.code}</td>
                <td>${product.name}</td>
                <td>${product.category_name}</td>
                <td>${product.stock}</td>
                <td><span class="${stockClass}">${product.stock <= product.min_stock ? 'Bajo' : 'Ok'}</span></td>
                <td>
                    <button class="action-btn" onclick="openMovementModal(${product.id}, 'entrada', '${product.name}')">Agregar Stock</button>
                    <button class="action-btn" onclick="openMovementModal(${product.id}, 'salida', '${product.name}')">Retirar Stock</button>
                    <button class="action-btn" style="background-color: #e74c3c;" onclick="deleteProduct(${product.id}, '${product.name}')">Eliminar</button>
                </td>
            `;

            productsTableBody.appendChild(row);
        });
    };

    const loadLowStock = async () => {
        const response = await fetch('/api/inventory/low-stock', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const products = await response.json();

        if (products.length > 0) {
            lowStockAlert.classList.remove('hidden');
            lowStockList.innerHTML = '';

            products.forEach(product => {
                const div = document.createElement('div');
                div.innerHTML = `
                    <strong>${product.code} - ${product.name}</strong>
                    <p>Stock Actual: ${product.stock} | Stock Mínimo: ${product.min_stock}</p>
                `;
                lowStockList.appendChild(div);
            });
        } else {
            lowStockAlert.classList.add('hidden');
        }
    };

    viewLowStock.addEventListener('click', () => {
        lowStockModal.style.display = 'block';
    });

    document.querySelectorAll('.modal-close').forEach(button => {
        button.addEventListener('click', () => {
            button.parentElement.parentElement.parentElement.style.display = 'none';
        });
    });

    const openMovementModal = (productId, type, productName) => {
        stockModal.style.display = 'block';
        document.getElementById('modalProductId').value = productId;
        document.getElementById('modalMovementType').value = type;
        document.getElementById('modalProductName').textContent = productName;
        document.getElementById('modalTitle').textContent = type === 'entrada' ? 'Agregar Stock' : 'Retirar Stock';
    };

    stockMovementForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const productId = document.getElementById('modalProductId').value;
        const type = document.getElementById('modalMovementType').value;
        const quantity = parseInt(document.getElementById('movementQuantity').value);
        const reason = document.getElementById('movementReason').value;

        const response = await fetch('/api/inventory/movement', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ product_id: productId, type, quantity, reason })
        });

        const result = await response.json();

        if (result.success) {
            alert(`${type.charAt(0).toUpperCase() + type.slice(1)} registrada exitosamente`);
            loadProducts();
            loadLowStock();
            stockModal.style.display = 'none';
        } else {
            alert(result.error || 'Error al registrar el movimiento');
        }
    });

    // Cargar movimientos
    const loadMovements = async (date = null) => {
        try {
            let url = '/api/inventory/movements';
            if (date) {
                url += `?date=${date}`;
            }

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const movements = await response.json();

            const movementsTableBody = document.getElementById('movementsTableBody');
            if (movementsTableBody) {
                movementsTableBody.innerHTML = '';
                movements.forEach(movement => {
                    const row = document.createElement('tr');
                    const date = new Date(movement.date);
                    const typeClass = movement.type === 'entrada' ? 'text-success' : 'text-danger';
                    const typeIcon = movement.type === 'entrada' ? '+' : '-';

                    row.innerHTML = `
                        <td>${date.toLocaleDateString('es-ES')} ${date.toLocaleTimeString('es-ES')}</td>
                        <td>${movement.product_code} - ${movement.product_name}</td>
                        <td><span class="${typeClass}">${typeIcon}${movement.type.toUpperCase()}</span></td>
                        <td>${movement.quantity}</td>
                        <td>${movement.responsible}</td>
                        <td>${movement.reason || '-'}</td>
                    `;

                    movementsTableBody.appendChild(row);
                });
            }
        } catch (error) {
            console.error('Error cargando movimientos:', error);
        }
    };

    // Configurar filtro de fecha para movimientos
    const movementDate = document.getElementById('movementDate');
    const filterMovements = document.getElementById('filterMovements');
    
    if (movementDate && filterMovements) {
        const today = new Date().toISOString().split('T')[0];
        movementDate.value = today;
        
        filterMovements.addEventListener('click', () => {
            const selectedDate = movementDate.value;
            loadMovements(selectedDate);
        });
    }

    // Función para eliminar producto
    const deleteProduct = async (productId, productName) => {
        if (confirm(`¿Estás seguro de eliminar el producto "${productName}"?\n\nEsta acción no se puede deshacer.`)) {
            try {
                const response = await fetch(`/api/inventory/products/${productId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                const result = await response.json();

                if (result.success) {
                    alert('Producto eliminado exitosamente');
                    loadProducts();
                    loadLowStock();
                } else {
                    alert(result.error || 'Error al eliminar el producto');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Error de conexión al eliminar el producto');
            }
        }
    };

    // Exponer funciones globalmente
    window.openMovementModal = openMovementModal;
    window.loadProducts = loadProducts;
    window.loadMovements = loadMovements;
    window.deleteProduct = deleteProduct;

    loadCategories();
    loadProducts();
    loadLowStock();
});
