document.addEventListener('DOMContentLoaded', () => {
    // Verificar autenticación
    if (!localStorage.getItem('token')) {
        window.location.href = 'index.html';
        return;
    }

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
            } else if (sectionName === 'reports') {
                loadReports();
            }
        });
    });

    const loadCategories = () => {
        const categories = localDB.getCategories();

        // Limpiar botones existentes (excepto "Todas")
        const existingButtons = categoriesButtons.querySelectorAll('.filter-btn:not([data-category="all"])');
        existingButtons.forEach(btn => btn.remove());

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
            button.dataset.category = category;
            button.textContent = category;
            button.addEventListener('click', () => {
                filterProductsByCategory(category);
                document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
            });
            categoriesButtons.appendChild(button);
        });
    };

    const loadProducts = () => {
        const search = searchInput.value;
        let products = search ? localDB.searchProducts(search) : localDB.getInventory();

        productsTableBody.innerHTML = '';
        products.forEach(product => {
            const row = document.createElement('tr');
            const stockClass = product.quantity <= product.minStock ? 'low-stock' : '';
            const productNameEscaped = product.name.replace(/'/g, "&apos;");

            row.innerHTML = `
                <td>LANG-${product.id.toString().padStart(4, '0')}</td>
                <td>${product.name}</td>
                <td>${product.category}</td>
                <td>${product.quantity}</td>
                <td><span class="${stockClass}">${product.quantity <= product.minStock ? 'Bajo' : 'Ok'}</span></td>
                <td>
                    <button class="action-btn" onclick="openMovementModal(${product.id}, 'entrada', '${productNameEscaped}')">Agregar Stock</button>
                    <button class="action-btn" onclick="openMovementModal(${product.id}, 'salida', '${productNameEscaped}')">Retirar Stock</button>
                    <button class="action-btn" style="background-color: #e74c3c;" onclick="deleteProduct(${product.id}, '${productNameEscaped}')">Eliminar</button>
                </td>
            `;

            productsTableBody.appendChild(row);
        });
    };

    const filterProductsByCategory = (category) => {
        const products = localDB.getProductsByCategory(category);

        productsTableBody.innerHTML = '';
        products.forEach(product => {
            const row = document.createElement('tr');
            const stockClass = product.quantity <= product.minStock ? 'low-stock' : '';
            const productNameEscaped = product.name.replace(/'/g, "&apos;");

            row.innerHTML = `
                <td>LANG-${product.id.toString().padStart(4, '0')}</td>
                <td>${product.name}</td>
                <td>${product.category}</td>
                <td>${product.quantity}</td>
                <td><span class="${stockClass}">${product.quantity <= product.minStock ? 'Bajo' : 'Ok'}</span></td>
                <td>
                    <button class="action-btn" onclick="openMovementModal(${product.id}, 'entrada', '${productNameEscaped}')">Agregar Stock</button>
                    <button class="action-btn" onclick="openMovementModal(${product.id}, 'salida', '${productNameEscaped}')">Retirar Stock</button>
                    <button class="action-btn" style="background-color: #e74c3c;" onclick="deleteProduct(${product.id}, '${productNameEscaped}')">Eliminar</button>
                </td>
            `;

            productsTableBody.appendChild(row);
        });
    };

    const loadLowStock = () => {
        const products = localDB.getLowStockProducts();

        if (products.length > 0) {
            lowStockAlert.classList.remove('hidden');
            lowStockList.innerHTML = '';

            products.forEach(product => {
                const div = document.createElement('div');
                div.innerHTML = `
                    <strong>LANG-${product.id.toString().padStart(4, '0')} - ${product.name}</strong>
                    <p>Stock Actual: ${product.quantity} | Stock Mínimo: ${product.minStock}</p>
                `;
                lowStockList.appendChild(div);
            });
        } else {
            lowStockAlert.classList.add('hidden');
        }
    };

    // Event Listeners
    if (viewLowStock) {
        viewLowStock.addEventListener('click', () => {
            lowStockModal.style.display = 'block';
        });
    }

    document.querySelectorAll('.modal-close').forEach(button => {
        button.addEventListener('click', () => {
            button.parentElement.parentElement.parentElement.style.display = 'none';
        });
    });

    if (searchInput) {
        searchInput.addEventListener('input', loadProducts);
    }

    const openMovementModal = (productId, type, productName) => {
        stockModal.style.display = 'block';
        document.getElementById('modalProductId').value = productId;
        document.getElementById('modalMovementType').value = type;
        document.getElementById('modalProductName').textContent = productName;
        document.getElementById('modalTitle').textContent = type === 'entrada' ? 'Agregar Stock' : 'Retirar Stock';
        document.getElementById('movementQuantity').value = '';
        document.getElementById('movementReason').value = '';
    };

    if (stockMovementForm) {
        stockMovementForm.addEventListener('submit', (event) => {
            event.preventDefault();

            const productId = parseInt(document.getElementById('modalProductId').value);
            const type = document.getElementById('modalMovementType').value;
            const quantity = parseInt(document.getElementById('movementQuantity').value);
            const reason = document.getElementById('movementReason').value;

            if (!quantity || quantity <= 0) {
                alert('Por favor ingresa una cantidad válida');
                return;
            }

            try {
                const product = localDB.getProduct(productId);
                if (!product) {
                    alert('Producto no encontrado');
                    return;
                }

                if (type === 'salida' && product.quantity < quantity) {
                    alert(`Stock insuficiente. Stock actual: ${product.quantity}`);
                    return;
                }

                // Actualizar cantidad
                const newQuantity = type === 'entrada' 
                    ? product.quantity + quantity 
                    : product.quantity - quantity;

                localDB.updateProduct(productId, { quantity: newQuantity });

                // Registrar movimiento
                localDB.addMovement({
                    productId: productId,
                    productName: product.name,
                    type: type,
                    quantity: quantity,
                    reason: reason || `${type === 'entrada' ? 'Entrada' : 'Salida'} de stock`,
                    user: localStorage.getItem('username') || 'Usuario'
                });

                alert(`${type.charAt(0).toUpperCase() + type.slice(1)} registrada exitosamente`);
                loadProducts();
                loadLowStock();
                stockModal.style.display = 'none';
            } catch (error) {
                console.error('Error:', error);
                alert('Error al registrar el movimiento');
            }
        });
    }

    // Cargar movimientos
    const loadMovements = (date = null) => {
        let movements = localDB.getMovements();
        
        // Filtrar por fecha si se especifica
        if (date) {
            const filterDate = new Date(date).toDateString();
            movements = movements.filter(movement => {
                const movementDate = new Date(movement.date).toDateString();
                return movementDate === filterDate;
            });
        }

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
                    <td>LANG-${movement.productId.toString().padStart(4, '0')} - ${movement.productName}</td>
                    <td><span class="${typeClass}">${typeIcon}${movement.type.toUpperCase()}</span></td>
                    <td>${movement.quantity}</td>
                    <td>${movement.user}</td>
                    <td>${movement.reason || '-'}</td>
                `;

                movementsTableBody.appendChild(row);
            });
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
    const deleteProduct = (productId, productName) => {
        if (confirm(`¿Estás seguro de eliminar el producto "${productName}"?\n\nEsta acción no se puede deshacer.`)) {
            try {
                const success = localDB.deleteProduct(productId);
                if (success) {
                    alert('Producto eliminado exitosamente');
                    loadProducts();
                    loadLowStock();
                } else {
                    alert('Error al eliminar el producto');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Error al eliminar el producto');
            }
        }
    };

    // Función para cargar reportes
    const loadReports = () => {
        const stats = localDB.getInventoryStats();
        const reportsSection = document.getElementById('reports-section');
        
        if (reportsSection) {
            const statsContainer = reportsSection.querySelector('.stats-container') || document.createElement('div');
            statsContainer.className = 'stats-container';
            
            statsContainer.innerHTML = `
                <div class="stat-card">
                    <h3>Total de Productos</h3>
                    <p class="stat-number">${stats.totalProducts}</p>
                </div>
                <div class="stat-card">
                    <h3>Valor Total del Inventario</h3>
                    <p class="stat-number">$${stats.totalValue.toFixed(2)}</p>
                </div>
                <div class="stat-card">
                    <h3>Productos con Stock Bajo</h3>
                    <p class="stat-number">${stats.lowStockItems}</p>
                </div>
                <div class="stat-card">
                    <h3>Cantidad Total en Stock</h3>
                    <p class="stat-number">${stats.totalQuantity}</p>
                </div>
            `;
            
            if (!reportsSection.querySelector('.stats-container')) {
                reportsSection.appendChild(statsContainer);
            }
        }
    };

    // Función para cerrar sesión
    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('userInfo');
        localStorage.removeItem('loginTime');
        // Redirigir a la página de login con la ruta completa
        window.location.href = window.location.origin + window.location.pathname.replace('dashboard.html', 'index.html');
    };

    // Agregar evento al botón de cerrar sesión si existe
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    // Exponer funciones globalmente
    window.openMovementModal = openMovementModal;
    window.loadProducts = loadProducts;
    window.loadMovements = loadMovements;
    window.deleteProduct = deleteProduct;
    window.logout = logout;

    // Inicializar aplicación
    loadCategories();
    loadProducts();
    loadLowStock();
});
