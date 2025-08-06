// Funciones globales para inventario
function openMovementModal(productId, type, productName) {
    const stockModal = document.getElementById('stockModal');
    stockModal.style.display = 'block';
    
    document.getElementById('modalProductId').value = productId;
    document.getElementById('modalMovementType').value = type;
    document.getElementById('modalProductName').textContent = productName;
    document.getElementById('modalTitle').textContent = type === 'entrada' ? 'Agregar Stock' : 'Retirar Stock';
    
    // Limpiar formulario
    document.getElementById('movementQuantity').value = '';
    document.getElementById('movementReason').value = '';
}

document.addEventListener('DOMContentLoaded', () => {
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchInput');
    const addProductForm = document.getElementById('addProductForm');
    const productCategorySelect = document.getElementById('productCategory');
    const usernameDisplay = document.getElementById('username');
    const logoutBtn = document.getElementById('logoutBtn');
    const movementsTableBody = document.getElementById('movementsTableBody');
    const movementDate = document.getElementById('movementDate');
    const filterMovements = document.getElementById('filterMovements');

    // Verificar autenticación
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/';
        return;
    }

    // Mostrar información de usuario
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
        const user = JSON.parse(userInfo);
        usernameDisplay.textContent = user.fullName || user.username;
        
        // Agregar indicador de rol si es necesario
        if (user.role === 'admin') {
            usernameDisplay.innerHTML += ' <i class="fas fa-crown" title="Administrador" style="color: #f39c12; margin-left: 0.5rem;"></i>';
        }
    }

    // Logout
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('userInfo');
        window.location.href = '/';
    });

    // Búsqueda de productos
    searchBtn.addEventListener('click', loadProducts);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            loadProducts();
        }
    });

    // Cargar categorías en el formulario de agregar producto
    const loadCategoriesForForm = async () => {
        try {
            const response = await fetch('/api/inventory/categories', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const categories = await response.json();

            productCategorySelect.innerHTML = '<option value="">Seleccionar categoría...</option>';
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                productCategorySelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error cargando categorías:', error);
        }
    };

    // Manejar cambio de tipo de unidad
    const unitTypeSelect = document.getElementById('unitType');
    const weightFields = document.getElementById('weightFields');
    const weightCalculator = document.getElementById('weightCalculator');

    if (unitTypeSelect) {
        unitTypeSelect.addEventListener('change', function() {
            const isWeightType = this.value === 'peso';
            
            if (isWeightType) {
                weightFields.classList.remove('hidden');
                weightCalculator.classList.remove('hidden');
                
                // Hacer requeridos los campos de peso
                document.getElementById('weightPerUnit').required = true;
            } else {
                weightFields.classList.add('hidden');
                weightCalculator.classList.add('hidden');
                
                // Quitar requerimiento de campos de peso
                document.getElementById('weightPerUnit').required = false;
                
                // Limpiar campos
                document.getElementById('weightPerUnit').value = '';
                document.getElementById('unitsPerReference').value = '10';
                document.getElementById('totalWeight').value = '';
                document.getElementById('calculationResult').classList.add('hidden');
            }
        });
    }

    // Calculadora de stock por peso
    const calculateStockBtn = document.getElementById('calculateStock');
    if (calculateStockBtn) {
        calculateStockBtn.addEventListener('click', async () => {
            const weightPerUnit = parseFloat(document.getElementById('weightPerUnit').value);
            const unitsPerReference = parseInt(document.getElementById('unitsPerReference').value) || 10;
            const totalWeight = parseFloat(document.getElementById('totalWeight').value);
            
            if (!weightPerUnit || !totalWeight || weightPerUnit <= 0 || totalWeight <= 0) {
                showNotification('Por favor, ingresa el peso por unidad y el peso total', 'error');
                return;
            }
            
            // Cálculo local (sin llamar al servidor)
            const weightPerReference = weightPerUnit * unitsPerReference;
            const estimatedUnits = Math.round((totalWeight / weightPerReference) * unitsPerReference);
            
            const resultDiv = document.getElementById('calculationResult');
            resultDiv.innerHTML = `
                <div class="calculation-details">
                    <h5><i class="fas fa-calculator"></i> Resultado del Cálculo</h5>
                    <div class="calc-row">
                        <strong>Unidades Estimadas:</strong> ${estimatedUnits}
                    </div>
                    <div class="calc-row">
                        <strong>Peso Total:</strong> ${totalWeight} kg
                    </div>
                    <div class="calc-row">
                        <strong>Peso por ${unitsPerReference} unidades:</strong> ${weightPerReference.toFixed(3)} kg
                    </div>
                    <div class="calc-formula">
                        <em>Fórmula: (${totalWeight} kg ÷ ${weightPerReference.toFixed(3)} kg) × ${unitsPerReference} unidades = ${estimatedUnits}</em>
                    </div>
                    <button type="button" id="useCalculatedStock" class="use-calculated-btn">
                        <i class="fas fa-check"></i> Usar este valor como stock inicial
                    </button>
                </div>
            `;
            
            resultDiv.classList.remove('hidden');
            
            // Agregar evento para usar el valor calculado
            document.getElementById('useCalculatedStock').addEventListener('click', () => {
                document.getElementById('initialStock').value = estimatedUnits;
                showNotification(`Stock inicial establecido en ${estimatedUnits} unidades`, 'success');
            });
        });
    }

    // Agregar nuevo producto
    addProductForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(addProductForm);
        const productData = {
            code: formData.get('code'),
            name: formData.get('name'),
            description: formData.get('description'),
            category_id: parseInt(formData.get('category_id')),
            stock: parseInt(formData.get('stock')) || 0,
            min_stock: parseInt(formData.get('min_stock')) || 5,
            unit_type: formData.get('unit_type') || 'unidad',
            weight_per_unit: formData.get('weight_per_unit') ? parseFloat(formData.get('weight_per_unit')) : null,
            units_per_weight_reference: parseInt(formData.get('units_per_weight_reference')) || 10
        };

        try {
            const response = await fetch('/api/inventory/products', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(productData)
            });

            const result = await response.json();

            if (result.success) {
                showNotification('Producto agregado exitosamente', 'success');
                addProductForm.reset();
                
                // Cambiar a la sección de inventario para ver el producto agregado
                document.querySelector('[data-section="inventory"]').click();
            } else {
                showNotification(result.error || 'Error al agregar producto', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification('Error de conexión', 'error');
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
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const movements = await response.json();

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
        } catch (error) {
            console.error('Error cargando movimientos:', error);
        }
    };

    // Filtrar movimientos por fecha
    filterMovements.addEventListener('click', () => {
        const selectedDate = movementDate.value;
        loadMovements(selectedDate);
    });

    // Función para mostrar notificaciones
    const showNotification = (message, type = 'info') => {
        const notification = document.getElementById('notification');
        const notificationMessage = document.getElementById('notificationMessage');
        
        notificationMessage.textContent = message;
        notification.className = `notification ${type}`;
        notification.classList.remove('hidden');

        setTimeout(() => {
            notification.classList.add('hidden');
        }, 3000);
    };

    // Cerrar notificaciones
    document.querySelector('.notification-close').addEventListener('click', () => {
        document.getElementById('notification').classList.add('hidden');
    });

    // Función global para cargar productos (usada por dashboard.js)
    window.loadProducts = async () => {
        const search = searchInput.value;
        try {
            const response = await fetch(`/api/inventory/products?search=${encodeURIComponent(search)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const products = await response.json();

            const productsTableBody = document.getElementById('productsTableBody');
            productsTableBody.innerHTML = '';
            
            products.forEach(product => {
                const row = document.createElement('tr');
                const stockClass = product.stock <= product.min_stock ? 'text-warning' : '';
                const stockStatus = product.stock <= product.min_stock ? 'Bajo' : 'OK';

                row.innerHTML = `
                    <td>${product.code}</td>
                    <td>${product.name}</td>
                    <td>${product.category_name}</td>
                    <td class="${stockClass}">${product.stock}</td>
                    <td><span class="${stockClass}">${stockStatus}</span></td>
                    <td>
                        <button class="action-btn" onclick="openMovementModal(${product.id}, 'entrada', '${product.name}')">
                            <i class="fas fa-plus"></i> Agregar
                        </button>
                        <button class="action-btn" onclick="openMovementModal(${product.id}, 'salida', '${product.name}')">
                            <i class="fas fa-minus"></i> Retirar
                        </button>
                    </td>
                `;

                productsTableBody.appendChild(row);
            });
        } catch (error) {
            console.error('Error cargando productos:', error);
            showNotification('Error cargando productos', 'error');
        }
    };

    // Configurar fecha actual para filtro de movimientos
    const today = new Date().toISOString().split('T')[0];
    movementDate.value = today;

    // Cargar datos iniciales
    loadCategoriesForForm();
    loadMovements();
    
    // Exponer función globalmente
    window.showNotification = showNotification;
});
