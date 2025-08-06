// ERP Dashboard Controller
class ERPDashboard {
    constructor() {
        this.currentUser = this.getCurrentUser();
        this.currentSection = 'dashboard';
        this.charts = {};
        this.data = {
            products: [],
            projects: [],
            movements: [],
            recipes: [],
            vouchers: []
        };
        
        this.init();
    }

    async init() {
        console.log('Inicializando ERP Dashboard...');
        
        // Verificar autenticación requerida
        if (!this.currentUser) {
            console.log('⚠️ No hay sesión activa, redirigiendo al login...');
            window.location.href = 'login.html';
            return;
        }

        // Inicializar base de datos ERP
        if (typeof ERPDatabase !== 'undefined') {
            await ERPDatabase.init();
            this.loadData();
        }

        // Configurar navegación
        this.setupNavigation();
        
        // Configurar scanner de códigos de barras
        if (typeof BarcodeScanner !== 'undefined') {
            this.scanner = new BarcodeScanner();
            this.setupBarcodeHandling();
        }

        // Configurar importador de recetas
        if (typeof RecipeImporter !== 'undefined') {
            this.recipeImporter = new RecipeImporter();
            this.setupRecipeHandling();
        }

        // Configurar eventos
        this.setupEventListeners();
        
        // Inicializar dashboard
        this.loadDashboard();
        
        // Mostrar información del usuario
        this.displayUserInfo();
        
        console.log('ERP Dashboard inicializado correctamente');
    }

    getCurrentUser() {
        const sessionData = localStorage.getItem('currentSession');
        if (sessionData) {
            const session = JSON.parse(sessionData);
            return session.user;
        }
        return null;
    }

    initDefaultSession() {
        const defaultUser = {
            id: 'admin',
            usuario: 'admin',
            nombre: 'Administrador',
            rol: 'Bodeguero',
            email: 'admin@lang.com'
        };

        const session = {
            user: defaultUser,
            timestamp: new Date().toISOString(),
            sessionId: 'session_' + Date.now()
        };

        localStorage.setItem('currentSession', JSON.stringify(session));
        this.currentUser = defaultUser;
        
        console.log('Sesión por defecto inicializada:', defaultUser);
    }

    displayUserInfo() {
        const usernameEl = document.getElementById('username');
        const userRoleEl = document.getElementById('userRole');
        
        if (this.currentUser && usernameEl && userRoleEl) {
            usernameEl.textContent = this.currentUser.nombre || this.currentUser.usuario;
            userRoleEl.textContent = this.currentUser.rol || 'Bodeguero';
        }
    }

    async loadData() {
        try {
            // Cargar datos directamente desde localStorage
            const products = JSON.parse(localStorage.getItem('erp_products') || '[]');
            const projects = JSON.parse(localStorage.getItem('erp_projects') || '[]');
            const movements = JSON.parse(localStorage.getItem('erp_movements') || '[]');
            const recipes = JSON.parse(localStorage.getItem('erp_recipes') || '[]');
            const vouchers = JSON.parse(localStorage.getItem('erp_withdrawal_vouchers') || '[]');
            
            this.data = {
                products: products,
                projects: projects,
                movements: movements,
                recipes: recipes,
                vouchers: vouchers
            };
            
            console.log('✅ Datos cargados:', this.data);
        } catch (error) {
            console.error('❌ Error cargando datos:', error);
            // Inicializar con datos vacíos en caso de error
            this.data = {
                products: [],
                projects: [],
                movements: [],
                recipes: [],
                vouchers: []
            };
        }
    }

    setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.getAttribute('data-section');
                this.switchSection(section);
            });
        });
    }

    switchSection(sectionName) {
        // Actualizar navegación activa
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const activeNavItem = document.querySelector(`[data-section="${sectionName}"]`).parentElement;
        activeNavItem.classList.add('active');
        
        // Mostrar sección correspondiente
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        
        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.classList.add('active');
            this.currentSection = sectionName;
            
            // Cargar contenido de la sección
            this.loadSection(sectionName);
        }
    }

    async loadSection(sectionName) {
        switch (sectionName) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'inventory':
                this.loadInventory();
                break;
            case 'projects':
                this.loadProjects();
                break;
            case 'recipes':
                this.loadRecipes();
                break;
            case 'movements':
                this.loadMovements();
                break;
            case 'vouchers':
                this.loadVouchers();
                break;
            case 'reports':
                this.loadReports();
                break;
            case 'kardex':
                this.loadKardex();
                break;
        }
    }

    async loadDashboard() {
        console.log('Cargando dashboard...');
        
        // Actualizar KPIs
        this.updateKPIs();
        
        // Cargar gráficos
        this.loadCharts();
        
        // Cargar actividades recientes
        this.loadRecentActivities();
    }

    updateKPIs() {
        const totalProducts = this.data.products.length;
        const lowStockItems = this.data.products.filter(p => (p.currentStock || 0) <= (p.minStock || 10)).length;
        const activeProjects = this.data.projects.filter(p => p.status === 'Activo').length;
        const currentMonth = new Date().getMonth();
        const monthlyMovements = this.data.movements.filter(m => {
            const movDate = new Date(m.date);
            return movDate.getMonth() === currentMonth;
        }).length;

        // Actualizar elementos DOM
        this.updateElement('totalProducts', totalProducts);
        this.updateElement('lowStockItems', lowStockItems);
        this.updateElement('activeProjects', activeProjects);
        this.updateElement('monthlyMovements', monthlyMovements);
        
        console.log('✅ KPIs actualizados:', { totalProducts, lowStockItems, activeProjects, monthlyMovements });
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    loadCharts() {
        this.loadCategoryChart();
        this.loadProjectChart();
    }

    loadCategoryChart() {
        const ctx = document.getElementById('categoryChart');
        if (!ctx) return;

        // Preparar datos por categoría
        const categoryData = {};
        this.data.movements.forEach(movement => {
            const product = this.data.products.find(p => p.id === movement.productId);
            if (product) {
                const category = product.categoria || 'Sin categoría';
                categoryData[category] = (categoryData[category] || 0) + movement.cantidad;
            }
        });

        const labels = Object.keys(categoryData);
        const data = Object.values(categoryData);
        const colors = [
            '#667eea', '#764ba2', '#f093fb', '#f5576c',
            '#4facfe', '#00f2fe', '#43e97b', '#38f9d7'
        ];

        if (this.charts.categoryChart) {
            this.charts.categoryChart.destroy();
        }

        this.charts.categoryChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors.slice(0, labels.length),
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    loadProjectChart() {
        const ctx = document.getElementById('projectChart');
        if (!ctx) return;

        // Preparar datos por proyecto
        const projectData = {};
        this.data.movements.forEach(movement => {
            if (movement.proyectoId) {
                const project = this.data.projects.find(p => p.id === movement.proyectoId);
                const projectName = project ? project.nombre : 'Proyecto desconocido';
                projectData[projectName] = (projectData[projectName] || 0) + movement.cantidad;
            }
        });

        const labels = Object.keys(projectData).slice(0, 5); // Top 5 proyectos
        const data = labels.map(label => projectData[label]);

        if (this.charts.projectChart) {
            this.charts.projectChart.destroy();
        }

        this.charts.projectChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Consumo de Materiales',
                    data: data,
                    backgroundColor: 'rgba(102, 126, 234, 0.8)',
                    borderColor: 'rgba(102, 126, 234, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    loadRecentActivities() {
        const container = document.getElementById('recentActivities');
        if (!container) return;

        // Obtener últimas 10 actividades
        const recentMovements = this.data.movements
            .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
            .slice(0, 10);

        container.innerHTML = recentMovements.map(movement => {
            const product = this.data.products.find(p => p.id === movement.productId);
            const productName = product ? product.nombre : 'Producto desconocido';
            const icon = movement.tipo === 'entrada' ? 'fa-arrow-down text-success' : 'fa-arrow-up text-danger';
            const timeAgo = this.getTimeAgo(movement.fecha);

            return `
                <div class="activity-item">
                    <div class="activity-icon">
                        <i class="fas ${icon}"></i>
                    </div>
                    <div class="activity-content">
                        <div class="activity-title">
                            ${movement.tipo === 'entrada' ? 'Entrada' : 'Salida'} - ${productName}
                        </div>
                        <div class="activity-details">
                            Cantidad: ${movement.cantidad} ${product ? product.unidad : ''}
                            ${movement.motivo ? `- ${movement.motivo}` : ''}
                        </div>
                        <div class="activity-time">${timeAgo}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    getTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Hoy';
        if (diffDays === 1) return 'Ayer';
        if (diffDays < 7) return `Hace ${diffDays} días`;
        if (diffDays < 30) return `Hace ${Math.ceil(diffDays / 7)} semanas`;
        return `Hace ${Math.ceil(diffDays / 30)} meses`;
    }

    async loadInventory() {
        console.log('Cargando inventario...');
        
        const tableBody = document.getElementById('inventoryTableBody');
        if (!tableBody) return;

        // Cargar filtros
        this.loadCategoryFilter();
        this.loadLocationFilter();

        // Mostrar productos en tabla
        tableBody.innerHTML = this.data.products.map(product => {
            const stockStatus = this.getStockStatus(product);
            const statusClass = stockStatus.class;
            const statusText = stockStatus.text;

            return `
                <tr>
                    <td>${product.code || product.id}</td>
                    <td>${product.barcode || '-'}</td>
                    <td>${product.name}</td>
                    <td>${product.category}</td>
                    <td>${product.currentStock || 0}</td>
                    <td>${product.unit}</td>
                    <td>${product.location || 'No definida'}</td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td>
                        <button class="btn-small btn-primary" onclick="erp.editProduct('${product.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-small btn-secondary" onclick="erp.showMovementModal('${product.id}')">
                            <i class="fas fa-exchange-alt"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    getStockStatus(product) {
        const stock = product.currentStock || 0;
        const minStock = product.minStock || 10;
        
        if (stock <= 0) {
            return { class: 'status-danger', text: 'Sin stock' };
        } else if (stock <= minStock) {
            return { class: 'status-warning', text: 'Stock bajo' };
        } else if (stock > minStock * 3) {
            return { class: 'status-info', text: 'Stock alto' };
        } else {
            return { class: 'status-success', text: 'Stock normal' };
        }
    }

    loadCategoryFilter() {
        const select = document.getElementById('categoryFilter');
        if (!select) return;

        const categories = [...new Set(this.data.products.map(p => p.categoria))].filter(Boolean);
        select.innerHTML = '<option value="">Todas las categorías</option>' +
            categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
    }

    loadLocationFilter() {
        const select = document.getElementById('locationFilter');
        if (!select) return;

        const locations = [...new Set(this.data.products.map(p => p.ubicacion))].filter(Boolean);
        select.innerHTML = '<option value="">Todas las ubicaciones</option>' +
            locations.map(loc => `<option value="${loc}">${loc}</option>`).join('');
    }

    async loadProjects() {
        console.log('Cargando proyectos...');
        
        const container = document.getElementById('projectsGrid');
        if (!container) return;

        container.innerHTML = this.data.projects.map(project => {
            const statusClass = project.estado === 'activo' ? 'status-success' : 
                               project.estado === 'pausado' ? 'status-warning' : 'status-danger';
            
            const progress = this.calculateProjectProgress(project);

            return `
                <div class="project-card">
                    <div class="project-header">
                        <h4>${project.nombre}</h4>
                        <span class="status-badge ${statusClass}">${project.estado}</span>
                    </div>
                    <div class="project-details">
                        <p><strong>CECO:</strong> ${project.ceco}</p>
                        <p><strong>Responsable:</strong> ${project.responsable}</p>
                        <p><strong>Fecha Inicio:</strong> ${new Date(project.fechaInicio).toLocaleDateString()}</p>
                        ${project.fechaFin ? `<p><strong>Fecha Fin:</strong> ${new Date(project.fechaFin).toLocaleDateString()}</p>` : ''}
                    </div>
                    <div class="project-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progress}%"></div>
                        </div>
                        <span class="progress-text">${progress}% completado</span>
                    </div>
                    <div class="project-actions">
                        <button class="btn-small btn-primary" onclick="erp.viewProject('${project.id}')">
                            <i class="fas fa-eye"></i> Ver
                        </button>
                        <button class="btn-small btn-secondary" onclick="erp.editProject('${project.id}')">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    calculateProjectProgress(project) {
        // Calcular progreso basado en consumo de materiales vs presupuestado
        // Por ahora retornamos un valor simulado
        return Math.floor(Math.random() * 100);
    }

    setupEventListeners() {
        // Botón de logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }

        // Refresh dashboard
        const refreshBtn = document.getElementById('refreshDashboard');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadData().then(() => this.loadDashboard());
            });
        }

        // Botones de acciones rápidas
        const quickScanBtn = document.getElementById('quickScanBtn');
        if (quickScanBtn) {
            quickScanBtn.addEventListener('click', () => this.quickScan());
        }

        const quickEntryBtn = document.getElementById('quickEntryBtn');
        if (quickEntryBtn) {
            quickEntryBtn.addEventListener('click', () => this.showQuickMovementModal('entrada'));
        }

        const quickExitBtn = document.getElementById('quickExitBtn');
        if (quickExitBtn) {
            quickExitBtn.addEventListener('click', () => this.showQuickMovementModal('salida'));
        }

        // Search en inventario
        const inventorySearch = document.getElementById('inventorySearch');
        if (inventorySearch) {
            inventorySearch.addEventListener('input', (e) => this.filterInventory(e.target.value));
        }

        // Filtros de inventario
        ['categoryFilter', 'stockFilter', 'locationFilter'].forEach(filterId => {
            const filter = document.getElementById(filterId);
            if (filter) {
                filter.addEventListener('change', () => this.applyInventoryFilters());
            }
        });
        
        // Botón agregar producto
        const addProductBtn = document.getElementById('addProductBtn');
        if (addProductBtn) {
            addProductBtn.addEventListener('click', () => this.addProduct());
        }
    }

    setupBarcodeHandling() {
        if (!this.scanner) return;

        this.scanner.onScan = (code) => {
            console.log('Código escaneado:', code);
            
            // Buscar producto por código de barras
            const product = this.data.products.find(p => 
                p.codigoBarras === code || p.codigo === code || p.id === code
            );

            if (product) {
                this.showProductInfo(product);
            } else {
                this.showNotification('Producto no encontrado', 'warning');
            }
        };

        // Activar scanner en campos específicos
        const barcodeInputs = document.querySelectorAll('.barcode-input');
        barcodeInputs.forEach(input => {
            this.scanner.attachToElement(input);
        });
    }

    setupRecipeHandling() {
        if (!this.recipeImporter) return;

        const fileInput = document.getElementById('recipeFileInput');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.processRecipeFile(file);
                }
            });
        }

        // Eventos del importador
        this.recipeImporter.onImport = (data) => {
            this.displayRecipePreview(data);
        };

        this.recipeImporter.onError = (error) => {
            this.showNotification(`Error procesando archivo: ${error}`, 'error');
        };
    }

    async processRecipeFile(file) {
        try {
            this.showNotification('Procesando archivo...', 'info');
            const data = await this.recipeImporter.processFile(file);
            this.displayRecipePreview(data);
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    }

    displayRecipePreview(recipeData) {
        const container = document.getElementById('recipe-preview');
        if (!container) return;

        // Validar stock para cada ítem
        const itemsWithStock = recipeData.items.map(item => {
            const product = this.data.products.find(p => 
                p.nombre.toLowerCase().includes(item.nombre.toLowerCase()) ||
                p.codigo === item.codigo ||
                p.codigoBarras === item.codigo
            );

            return {
                ...item,
                productFound: !!product,
                currentStock: product ? product.stock : 0,
                available: product ? (product.stock >= item.cantidad) : false
            };
        });

        container.innerHTML = `
            <div class="recipe-header">
                <h3>Lista de Materiales: ${recipeData.nombre || 'Sin nombre'}</h3>
                <div class="recipe-summary">
                    <span class="recipe-stat">
                        <i class="fas fa-list"></i> ${itemsWithStock.length} ítems
                    </span>
                    <span class="recipe-stat">
                        <i class="fas fa-check-circle text-success"></i> 
                        ${itemsWithStock.filter(i => i.available).length} disponibles
                    </span>
                    <span class="recipe-stat">
                        <i class="fas fa-times-circle text-danger"></i> 
                        ${itemsWithStock.filter(i => !i.available).length} no disponibles
                    </span>
                </div>
            </div>
            
            <table class="recipe-table">
                <thead>
                    <tr>
                        <th>Ítem</th>
                        <th>Cantidad Requerida</th>
                        <th>Stock Actual</th>
                        <th>Estado</th>
                        <th>Unidad</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsWithStock.map(item => `
                        <tr class="${item.available ? 'in-stock' : 'out-of-stock'}">
                            <td>${item.nombre}</td>
                            <td>${item.cantidad}</td>
                            <td>${item.currentStock}</td>
                            <td>
                                ${item.available ? 
                                    '<i class="fas fa-check text-success"></i> Disponible' : 
                                    '<i class="fas fa-times text-danger"></i> Insuficiente'
                                }
                            </td>
                            <td>${item.unidad || 'UN'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div class="recipe-actions">
                <button class="primary-btn" onclick="erp.generateVoucherFromRecipe()">
                    <i class="fas fa-file-invoice"></i> Generar Vale de Retiro
                </button>
                <button class="secondary-btn" onclick="erp.saveRecipe()">
                    <i class="fas fa-save"></i> Guardar Lista
                </button>
            </div>
        `;

        // Guardar datos de la receta actual
        this.currentRecipe = {
            ...recipeData,
            items: itemsWithStock
        };
    }

    quickScan() {
        if (this.scanner) {
            this.showNotification('Escanee un código de barras...', 'info');
            this.scanner.startListening();
        }
    }

    showQuickMovementModal(type) {
        const modal = document.getElementById('quickMovementModal');
        const title = document.getElementById('movementModalTitle');
        const projectGroup = document.getElementById('projectGroup');
        
        if (!modal || !title) return;

        title.textContent = type === 'entrada' ? 'Entrada Rápida' : 'Salida Rápida';
        
        // Mostrar campo de proyecto solo para salidas
        if (projectGroup) {
            projectGroup.style.display = type === 'salida' ? 'block' : 'none';
        }

        this.currentMovementType = type;
        this.showModal('quickMovementModal');
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }

    showProductInfo(product) {
        this.showNotification(`Producto: ${product.nombre} - Stock: ${product.stock} ${product.unidad}`, 'success');
    }

    showNotification(message, type = 'info') {
        // Crear notificación toast
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : 'info'}"></i>
            <span>${message}</span>
        `;

        document.body.appendChild(notification);

        // Auto-remover después de 3 segundos
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    filterInventory(searchTerm) {
        if (!searchTerm) {
            this.loadInventory();
            return;
        }

        const filtered = this.data.products.filter(product => {
            const search = searchTerm.toLowerCase();
            return (
                (product.nombre && product.nombre.toLowerCase().includes(search)) ||
                (product.codigo && product.codigo.toLowerCase().includes(search)) ||
                (product.codigoBarras && product.codigoBarras.toLowerCase().includes(search)) ||
                (product.categoria && product.categoria.toLowerCase().includes(search)) ||
                (product.descripcion && product.descripcion.toLowerCase().includes(search))
            );
        });

        this.displayFilteredInventory(filtered);
    }

    displayFilteredInventory(products) {
        const tableBody = document.getElementById('inventoryTableBody');
        if (!tableBody) return;

        tableBody.innerHTML = products.map(product => {
            const stockStatus = this.getStockStatus(product);
            const statusClass = stockStatus.class;
            const statusText = stockStatus.text;

            return `
                <tr>
                    <td>${product.codigo || product.id}</td>
                    <td>${product.codigoBarras || '-'}</td>
                    <td>${product.nombre}</td>
                    <td>${product.categoria}</td>
                    <td>${product.stock || 0}</td>
                    <td>${product.unidad}</td>
                    <td>${product.ubicacion || 'No definida'}</td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td>
                        <button class="btn-small btn-primary" onclick="erp.editProduct('${product.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-small btn-secondary" onclick="erp.showMovementModal('${product.id}')">
                            <i class="fas fa-exchange-alt"></i>
                        </button>
                        <button class="btn-small btn-info" onclick="erp.viewProduct('${product.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        // Mostrar mensaje si no hay resultados
        if (products.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center" style="padding: 2rem; color: #7f8c8d;">
                        <i class="fas fa-search" style="font-size: 2rem; margin-bottom: 1rem; display: block;"></i>
                        No se encontraron productos que coincidan con la búsqueda
                    </td>
                </tr>
            `;
        }
    }

    applyInventoryFilters() {
        const categoryFilter = document.getElementById('categoryFilter')?.value || '';
        const stockFilter = document.getElementById('stockFilter')?.value || '';
        const locationFilter = document.getElementById('locationFilter')?.value || '';
        const searchTerm = document.getElementById('inventorySearch')?.value || '';

        let filtered = this.data.products;

        // Filtro de búsqueda
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            filtered = filtered.filter(product => {
                return (
                    (product.nombre && product.nombre.toLowerCase().includes(search)) ||
                    (product.codigo && product.codigo.toLowerCase().includes(search)) ||
                    (product.codigoBarras && product.codigoBarras.toLowerCase().includes(search)) ||
                    (product.categoria && product.categoria.toLowerCase().includes(search)) ||
                    (product.descripcion && product.descripcion.toLowerCase().includes(search))
                );
            });
        }

        // Filtro de categoría
        if (categoryFilter) {
            filtered = filtered.filter(product => product.categoria === categoryFilter);
        }

        // Filtro de ubicación
        if (locationFilter) {
            filtered = filtered.filter(product => product.ubicacion === locationFilter);
        }

        // Filtro de stock
        if (stockFilter) {
            filtered = filtered.filter(product => {
                const stock = product.stock || 0;
                const minStock = product.stockMinimo || 10;
                
                switch (stockFilter) {
                    case 'sin-stock':
                        return stock <= 0;
                    case 'stock-bajo':
                        return stock > 0 && stock <= minStock;
                    case 'stock-normal':
                        return stock > minStock && stock <= minStock * 3;
                    case 'stock-alto':
                        return stock > minStock * 3;
                    default:
                        return true;
                }
            });
        }

        this.displayFilteredInventory(filtered);
    }

    logout() {
        localStorage.removeItem('currentSession');
        localStorage.removeItem('rememberedUser');
        console.log('👋 Sesión cerrada, redirigiendo al login...');
        window.location.href = 'login.html';
    }

    // Métodos auxiliares para manejo de datos
    async saveProduct(productData) {
        if (typeof ERPDatabase !== 'undefined') {
            await ERPDatabase.saveProduct(productData);
            await this.loadData();
            this.loadInventory();
        }
    }

    async saveProject(projectData) {
        if (typeof ERPDatabase !== 'undefined') {
            await ERPDatabase.saveProject(projectData);
            await this.loadData();
            this.loadProjects();
        }
    }

    async saveMovement(movementData) {
        if (typeof ERPDatabase !== 'undefined') {
            await ERPDatabase.saveMovement(movementData);
            await this.loadData();
            this.updateKPIs();
            this.loadRecentActivities();
        }
    }

    // Métodos para las secciones faltantes
    async loadRecipes() {
        console.log('Cargando recetas...');
        // Por ahora solo mostramos el estado vacío
        const container = document.getElementById('recipe-preview');
        if (container && !this.currentRecipe) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-file-upload"></i>
                    <h3>Cargar Lista de Materiales</h3>
                    <p>Selecciona un archivo Excel (.xlsx) o PDF con la lista de materiales para procesarla automáticamente.</p>
                    <div class="supported-formats">
                        <small>
                            <i class="fas fa-file-excel"></i> Excel (.xlsx) |
                            <i class="fas fa-file-pdf"></i> PDF (con texto)
                        </small>
                    </div>
                </div>
            `;
        }
    }

    async loadMovements() {
        console.log('Cargando movimientos...');
        // Implementar carga de movimientos
        this.showNotification('Sección de movimientos cargada', 'info');
    }

    async loadVouchers() {
        console.log('Cargando vales...');
        // Implementar carga de vales
        this.showNotification('Sección de vales cargada', 'info');
    }

    async loadReports() {
        console.log('Cargando reportes...');
        // Implementar carga de reportes
        this.showNotification('Sección de reportes cargada', 'info');
    }

    async loadKardex() {
        console.log('Cargando kardex...');
        // Implementar carga de kardex
        this.showNotification('Sección de kardex cargada', 'info');
    }

    // Funciones para manejo de productos
    editProduct(productId) {
        const product = this.data.products.find(p => p.id === productId);
        if (!product) {
            this.showNotification('Producto no encontrado', 'error');
            return;
        }

        // Crear modal de edición de producto
        const modal = this.createProductModal(product, 'edit');
        document.body.appendChild(modal);
        modal.style.display = 'block';
    }

    viewProduct(productId) {
        const product = this.data.products.find(p => p.id === productId);
        if (!product) {
            this.showNotification('Producto no encontrado', 'error');
            return;
        }

        // Crear modal de vista de producto
        const modal = this.createProductViewModal(product);
        document.body.appendChild(modal);
        modal.style.display = 'block';
    }

    addProduct() {
        // Crear modal de agregar producto
        const modal = this.createProductModal(null, 'add');
        document.body.appendChild(modal);
        modal.style.display = 'block';
    }

    createProductModal(product, mode) {
        const isEdit = mode === 'edit';
        const isAdd = mode === 'add';
        const title = isAdd ? 'Agregar Producto' : 'Editar Producto';
        
        const modal = document.createElement('div');
        modal.className = 'modal product-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <form class="product-form" id="productForm">
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="productCode">Código *</label>
                            <input type="text" id="productCode" name="codigo" 
                                   value="${product?.codigo || ''}" required>
                        </div>
                        <div class="form-group">
                            <label for="productBarcode">Código de Barras</label>
                            <input type="text" id="productBarcode" name="codigoBarras" 
                                   value="${product?.codigoBarras || ''}" class="barcode-input">
                        </div>
                        <div class="form-group full-width">
                            <label for="productName">Nombre *</label>
                            <input type="text" id="productName" name="nombre" 
                                   value="${product?.nombre || ''}" required>
                        </div>
                        <div class="form-group">
                            <label for="productCategory">Categoría *</label>
                            <select id="productCategory" name="categoria" required>
                                <option value="">Seleccionar categoría</option>
                                <option value="Herramientas" ${product?.categoria === 'Herramientas' ? 'selected' : ''}>Herramientas</option>
                                <option value="Materiales" ${product?.categoria === 'Materiales' ? 'selected' : ''}>Materiales</option>
                                <option value="Equipos" ${product?.categoria === 'Equipos' ? 'selected' : ''}>Equipos</option>
                                <option value="Consumibles" ${product?.categoria === 'Consumibles' ? 'selected' : ''}>Consumibles</option>
                                <option value="Repuestos" ${product?.categoria === 'Repuestos' ? 'selected' : ''}>Repuestos</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="productUnit">Unidad *</label>
                            <select id="productUnit" name="unidad" required>
                                <option value="">Seleccionar unidad</option>
                                <option value="UN" ${product?.unidad === 'UN' ? 'selected' : ''}>Unidad (UN)</option>
                                <option value="KG" ${product?.unidad === 'KG' ? 'selected' : ''}>Kilogramo (KG)</option>
                                <option value="MT" ${product?.unidad === 'MT' ? 'selected' : ''}>Metro (MT)</option>
                                <option value="LT" ${product?.unidad === 'LT' ? 'selected' : ''}>Litro (LT)</option>
                                <option value="M2" ${product?.unidad === 'M2' ? 'selected' : ''}>Metro cuadrado (M2)</option>
                                <option value="M3" ${product?.unidad === 'M3' ? 'selected' : ''}>Metro cúbico (M3)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="productStock">Stock Actual</label>
                            <input type="number" id="productStock" name="stock" 
                                   value="${product?.stock || 0}" min="0" step="0.01">
                        </div>
                        <div class="form-group">
                            <label for="productMinStock">Stock Mínimo</label>
                            <input type="number" id="productMinStock" name="stockMinimo" 
                                   value="${product?.stockMinimo || 10}" min="0" step="0.01">
                        </div>
                        <div class="form-group">
                            <label for="productLocation">Ubicación</label>
                            <input type="text" id="productLocation" name="ubicacion" 
                                   value="${product?.ubicacion || ''}">
                        </div>
                        <div class="form-group">
                            <label for="productPrice">Precio Unitario</label>
                            <input type="number" id="productPrice" name="precio" 
                                   value="${product?.precio || 0}" min="0" step="0.01">
                        </div>
                        <div class="form-group full-width">
                            <label for="productDescription">Descripción</label>
                            <textarea id="productDescription" name="descripcion" rows="3">${product?.descripcion || ''}</textarea>
                        </div>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
                        <button type="submit" class="btn-primary">${isAdd ? 'Agregar' : 'Guardar Cambios'}</button>
                    </div>
                </form>
            </div>
        `;

        // Agregar event listener para el formulario
        const form = modal.querySelector('#productForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleProductSubmit(form, product, mode);
            modal.remove();
        });

        return modal;
    }

    createProductViewModal(product) {
        const modal = document.createElement('div');
        modal.className = 'modal product-view-modal';
        
        // Calcular valor del stock
        const stockValue = (product.stock || 0) * (product.precio || 0);
        const stockStatus = this.getStockStatus(product);
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Detalle del Producto</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="product-details">
                    <div class="product-info-grid">
                        <div class="info-card">
                            <h4>Información Básica</h4>
                            <div class="info-item">
                                <span class="info-label">Código:</span>
                                <span class="info-value">${product.codigo || product.id}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Código de Barras:</span>
                                <span class="info-value">${product.codigoBarras || 'No definido'}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Nombre:</span>
                                <span class="info-value">${product.nombre}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Categoría:</span>
                                <span class="info-value">${product.categoria}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Unidad:</span>
                                <span class="info-value">${product.unidad}</span>
                            </div>
                        </div>
                        
                        <div class="info-card">
                            <h4>Información de Stock</h4>
                            <div class="info-item">
                                <span class="info-label">Stock Actual:</span>
                                <span class="info-value stock-value">${product.stock || 0} ${product.unidad}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Stock Mínimo:</span>
                                <span class="info-value">${product.stockMinimo || 10} ${product.unidad}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Estado:</span>
                                <span class="status-badge ${stockStatus.class}">${stockStatus.text}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Precio Unitario:</span>
                                <span class="info-value">$${(product.precio || 0).toLocaleString()}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Valor Total:</span>
                                <span class="info-value stock-value">$${stockValue.toLocaleString()}</span>
                            </div>
                        </div>
                        
                        <div class="info-card">
                            <h4>Ubicación y Otros</h4>
                            <div class="info-item">
                                <span class="info-label">Ubicación:</span>
                                <span class="info-value">${product.ubicacion || 'No definida'}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Descripción:</span>
                                <span class="info-value">${product.descripcion || 'Sin descripción'}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="product-actions-view">
                        <button class="btn-primary" onclick="erp.editProduct('${product.id}'); this.closest('.modal').remove();">
                            <i class="fas fa-edit"></i> Editar Producto
                        </button>
                        <button class="btn-secondary" onclick="erp.showMovementModal('${product.id}'); this.closest('.modal').remove();">
                            <i class="fas fa-exchange-alt"></i> Registrar Movimiento
                        </button>
                        <button class="btn-info" onclick="this.closest('.modal').remove()">
                            <i class="fas fa-times"></i> Cerrar
                        </button>
                    </div>
                </div>
            </div>
        `;

        return modal;
    }

    showMovementModal(productId) {
        const product = this.data.products.find(p => p.id === productId);
        if (!product) {
            this.showNotification('Producto no encontrado', 'error');
            return;
        }

        const modal = this.createMovementModal(product);
        document.body.appendChild(modal);
        modal.style.display = 'block';
    }

    createMovementModal(product) {
        const modal = document.createElement('div');
        modal.className = 'modal movement-modal';
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Registrar Movimiento</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="product-info-banner">
                    <div class="product-name">${product.nombre}</div>
                    <div class="product-stock">Stock Actual: ${product.stock || 0} ${product.unidad}</div>
                </div>
                <form class="movement-form" id="movementForm">
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="movementType">Tipo de Movimiento *</label>
                            <select id="movementType" name="tipo" required>
                                <option value="">Seleccionar tipo</option>
                                <option value="entrada">Entrada</option>
                                <option value="salida">Salida</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="movementQuantity">Cantidad *</label>
                            <input type="number" id="movementQuantity" name="cantidad" 
                                   min="0" step="0.01" required>
                        </div>
                        <div class="form-group" id="projectGroup" style="display: none;">
                            <label for="movementProject">Proyecto</label>
                            <select id="movementProject" name="proyectoId">
                                <option value="">Sin proyecto</option>
                                ${this.data.projects.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="movementReason">Motivo</label>
                            <input type="text" id="movementReason" name="motivo" 
                                   placeholder="Razón del movimiento">
                        </div>
                        <div class="form-group full-width">
                            <label for="movementNotes">Observaciones</label>
                            <textarea id="movementNotes" name="observaciones" rows="3"></textarea>
                        </div>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
                        <button type="submit" class="btn-primary">Registrar Movimiento</button>
                    </div>
                </form>
            </div>
        `;

        // Configurar eventos del formulario
        const form = modal.querySelector('#movementForm');
        const typeSelect = modal.querySelector('#movementType');
        const projectGroup = modal.querySelector('#projectGroup');

        typeSelect.addEventListener('change', (e) => {
            if (e.target.value === 'salida') {
                projectGroup.style.display = 'block';
            } else {
                projectGroup.style.display = 'none';
            }
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleMovementSubmit(form, product);
            modal.remove();
        });

        return modal;
    }

    async handleProductSubmit(form, product, mode) {
        const formData = new FormData(form);
        const productData = {};
        
        for (let [key, value] of formData.entries()) {
            productData[key] = value;
        }

        // Convertir números
        ['stock', 'stockMinimo', 'precio'].forEach(field => {
            if (productData[field]) {
                productData[field] = parseFloat(productData[field]);
            }
        });

        try {
            if (mode === 'edit' && product) {
                // Actualizar producto existente
                productData.id = product.id;
                await this.updateProduct(productData);
                this.showNotification('Producto actualizado correctamente', 'success');
            } else {
                // Crear nuevo producto
                productData.id = 'prod_' + Date.now();
                await this.createProduct(productData);
                this.showNotification('Producto creado correctamente', 'success');
            }
            
            // Recargar datos y vista
            await this.loadData();
            if (this.currentSection === 'inventory') {
                this.loadInventory();
            }
        } catch (error) {
            this.showNotification('Error al guardar producto: ' + error.message, 'error');
        }
    }

    async handleMovementSubmit(form, product) {
        const formData = new FormData(form);
        const movementData = {
            id: 'mov_' + Date.now(),
            productId: product.id,
            fecha: new Date().toISOString(),
            usuario: this.currentUser.usuario || this.currentUser.nombre
        };
        
        for (let [key, value] of formData.entries()) {
            movementData[key] = value;
        }

        // Convertir cantidad a número
        movementData.cantidad = parseFloat(movementData.cantidad);

        try {
            // Validar stock para salidas
            if (movementData.tipo === 'salida') {
                const currentStock = product.stock || 0;
                if (movementData.cantidad > currentStock) {
                    this.showNotification('Stock insuficiente para la salida', 'error');
                    return;
                }
            }

            // Registrar movimiento
            await this.saveMovement(movementData);
            
            // Actualizar stock del producto
            const newStock = movementData.tipo === 'entrada' 
                ? (product.stock || 0) + movementData.cantidad
                : (product.stock || 0) - movementData.cantidad;

            await this.updateProductStock(product.id, newStock);
            
            this.showNotification('Movimiento registrado correctamente', 'success');
            
            // Recargar datos
            await this.loadData();
            this.updateKPIs();
            this.loadRecentActivities();
            
            if (this.currentSection === 'inventory') {
                this.loadInventory();
            }
        } catch (error) {
            this.showNotification('Error al registrar movimiento: ' + error.message, 'error');
        }
    }

    async createProduct(productData) {
        try {
            // Convertir estructura a la de la base de datos
            const newProduct = {
                id: productData.id || Date.now(),
                code: productData.codigo || productData.id,
                barcode: productData.codigoBarras || '',
                name: productData.nombre,
                description: productData.descripcion || '',
                category: productData.categoria,
                unit: productData.unidad,
                currentStock: parseFloat(productData.stock || 0),
                minStock: parseFloat(productData.stockMinimo || 10),
                maxStock: parseFloat(productData.stockMinimo || 10) * 5,
                location: productData.ubicacion || '',
                supplier: '',
                dateAdded: new Date().toISOString(),
                lastModified: new Date().toISOString(),
                isActive: true
            };

            // Obtener productos actuales
            const products = JSON.parse(localStorage.getItem('erp_products') || '[]');
            
            // Agregar nuevo producto
            products.push(newProduct);
            
            // Guardar en localStorage
            localStorage.setItem('erp_products', JSON.stringify(products));
            
            return newProduct;
        } catch (error) {
            throw new Error('Error creando producto: ' + error.message);
        }
    }

    async updateProduct(productData) {
        try {
            // Obtener productos actuales
            const products = JSON.parse(localStorage.getItem('erp_products') || '[]');
            
            // Encontrar el índice del producto
            const index = products.findIndex(p => p.id == productData.id);
            if (index === -1) {
                throw new Error('Producto no encontrado');
            }
            
            // Actualizar el producto manteniendo la estructura de la DB
            const updatedProduct = {
                ...products[index],
                code: productData.codigo || products[index].code,
                barcode: productData.codigoBarras || products[index].barcode,
                name: productData.nombre || products[index].name,
                description: productData.descripcion || products[index].description,
                category: productData.categoria || products[index].category,
                unit: productData.unidad || products[index].unit,
                currentStock: parseFloat(productData.stock || products[index].currentStock),
                minStock: parseFloat(productData.stockMinimo || products[index].minStock),
                location: productData.ubicacion || products[index].location,
                lastModified: new Date().toISOString()
            };
            
            // Reemplazar el producto
            products[index] = updatedProduct;
            
            // Guardar en localStorage
            localStorage.setItem('erp_products', JSON.stringify(products));
            
            return updatedProduct;
        } catch (error) {
            throw new Error('Error actualizando producto: ' + error.message);
        }
    }

    async updateProductStock(productId, newStock) {
        try {
            // Obtener productos actuales
            const products = JSON.parse(localStorage.getItem('erp_products') || '[]');
            
            // Encontrar el índice del producto
            const index = products.findIndex(p => p.id == productId);
            if (index === -1) {
                throw new Error('Producto no encontrado');
            }
            
            // Actualizar solo el stock
            products[index].currentStock = parseFloat(newStock);
            products[index].lastModified = new Date().toISOString();
            
            // Guardar en localStorage
            localStorage.setItem('erp_products', JSON.stringify(products));
            
            return products[index];
        } catch (error) {
            throw new Error('Error actualizando stock: ' + error.message);
        }
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.erp = new ERPDashboard();
});

// Función global para cerrar modales
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Event listeners para cerrar modales
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
    if (e.target.classList.contains('modal-close')) {
        const modal = e.target.closest('.modal');
        if (modal) modal.style.display = 'none';
    }
});

// Estilos CSS adicionales para notificaciones
const notificationStyles = `
    <style>
        .notification {
            position: fixed;
            top: 100px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 5px;
            color: white;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            z-index: 10001;
            animation: slideIn 0.3s ease;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        .notification-success {
            background: linear-gradient(135deg, #27ae60, #2ecc71);
        }
        
        .notification-error {
            background: linear-gradient(135deg, #e74c3c, #c0392b);
        }
        
        .notification-warning {
            background: linear-gradient(135deg, #f39c12, #e67e22);
        }
        
        .notification-info {
            background: linear-gradient(135deg, #3498db, #2980b9);
        }
        
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        .status-badge {
            padding: 0.25rem 0.75rem;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: 500;
        }
        
        .status-success {
            background: rgba(46, 204, 113, 0.2);
            color: #27ae60;
        }
        
        .status-warning {
            background: rgba(243, 156, 18, 0.2);
            color: #e67e22;
        }
        
        .status-danger {
            background: rgba(231, 76, 60, 0.2);
            color: #c0392b;
        }
        
        .status-info {
            background: rgba(52, 152, 219, 0.2);
            color: #2980b9;
        }
        
        .btn-small {
            padding: 0.375rem 0.75rem;
            font-size: 0.8rem;
            border-radius: 3px;
            border: none;
            cursor: pointer;
            margin: 0 0.25rem;
        }
        
        .btn-primary {
            background: #3498db;
            color: white;
        }
        
        .btn-secondary {
            background: #95a5a6;
            color: white;
        }
        
        .filters-section {
            display: flex;
            gap: 1rem;
            margin-bottom: 1.5rem;
            padding: 1rem;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .filter-group {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }
        
        .filter-group label {
            font-weight: 500;
            color: #2c3e50;
            font-size: 0.9rem;
        }
        
        .charts-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2rem;
            margin: 2rem 0;
        }
        
        .chart-container {
            background: white;
            padding: 1.5rem;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .chart-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid #ecf0f1;
        }
        
        .recent-activities {
            background: white;
            border-radius: 8px;
            padding: 1.5rem;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-top: 2rem;
        }
        
        .activities-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid #ecf0f1;
        }
        
        .activity-item {
            display: flex;
            gap: 1rem;
            padding: 1rem 0;
            border-bottom: 1px solid #f8f9fa;
        }
        
        .activity-icon {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f8f9fa;
        }
        
        .activity-content {
            flex: 1;
        }
        
        .activity-title {
            font-weight: 500;
            color: #2c3e50;
        }
        
        .activity-details {
            color: #7f8c8d;
            font-size: 0.9rem;
            margin: 0.25rem 0;
        }
        
        .activity-time {
            color: #95a5a6;
            font-size: 0.8rem;
        }
        
        .projects-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 1.5rem;
        }
        
        .project-card {
            background: white;
            border-radius: 8px;
            padding: 1.5rem;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            transition: transform 0.2s ease;
        }
        
        .project-card:hover {
            transform: translateY(-2px);
        }
        
        .project-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
        }
        
        .project-header h4 {
            margin: 0;
            color: #2c3e50;
        }
        
        .project-details p {
            margin: 0.5rem 0;
            color: #7f8c8d;
            font-size: 0.9rem;
        }
        
        .project-progress {
            margin: 1rem 0;
        }
        
        .progress-bar {
            width: 100%;
            height: 6px;
            background: #ecf0f1;
            border-radius: 3px;
            overflow: hidden;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(135deg, #667eea, #764ba2);
            transition: width 0.3s ease;
        }
        
        .progress-text {
            font-size: 0.8rem;
            color: #7f8c8d;
            margin-top: 0.5rem;
            display: block;
        }
        
        .project-actions {
            display: flex;
            gap: 0.5rem;
            margin-top: 1rem;
        }
        
        /* Estilos para modales */
        .modal {
            display: none;
            position: fixed;
            z-index: 10000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.5);
            animation: fadeIn 0.3s ease;
        }
        
        .modal-content {
            background-color: white;
            margin: 5% auto;
            padding: 0;
            border-radius: 8px;
            width: 90%;
            max-width: 600px;
            max-height: 85vh;
            overflow-y: auto;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            animation: slideInDown 0.3s ease;
        }
        
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1.5rem;
            border-bottom: 1px solid #ecf0f1;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border-radius: 8px 8px 0 0;
        }
        
        .modal-header h3 {
            margin: 0;
            font-size: 1.2rem;
        }
        
        .modal-close {
            background: none;
            border: none;
            font-size: 1.5rem;
            color: white;
            cursor: pointer;
            padding: 0.5rem;
            border-radius: 50%;
            transition: background-color 0.2s;
        }
        
        .modal-close:hover {
            background-color: rgba(255,255,255,0.1);
        }
        
        /* Formularios */
        .product-form, .movement-form {
            padding: 1.5rem;
        }
        
        .form-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
        }
        
        .form-group {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }
        
        .form-group.full-width {
            grid-column: 1 / -1;
        }
        
        .form-group label {
            font-weight: 500;
            color: #2c3e50;
            font-size: 0.9rem;
        }
        
        .form-group input,
        .form-group select,
        .form-group textarea {
            padding: 0.75rem;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 0.9rem;
            transition: border-color 0.2s;
        }
        
        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
        }
        
        .form-actions {
            display: flex;
            gap: 1rem;
            justify-content: flex-end;
            margin-top: 2rem;
            padding-top: 1rem;
            border-top: 1px solid #ecf0f1;
        }
        
        .btn-primary, .btn-secondary, .btn-info {
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 4px;
            font-size: 0.9rem;
            cursor: pointer;
            transition: background-color 0.2s;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
        }
        
        .btn-primary:hover {
            background: linear-gradient(135deg, #5a6fd8, #6b4190);
        }
        
        .btn-secondary {
            background: #95a5a6;
            color: white;
        }
        
        .btn-secondary:hover {
            background: #7f8c8d;
        }
        
        .btn-info {
            background: #3498db;
            color: white;
        }
        
        .btn-info:hover {
            background: #2980b9;
        }
        
        /* Modal de vista de producto */
        .product-view-modal .modal-content {
            max-width: 800px;
        }
        
        .product-details {
            padding: 1.5rem;
        }
        
        .product-info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        
        .info-card {
            background: #f8f9fa;
            padding: 1.5rem;
            border-radius: 8px;
            border-left: 4px solid #667eea;
        }
        
        .info-card h4 {
            margin: 0 0 1rem 0;
            color: #2c3e50;
            font-size: 1.1rem;
        }
        
        .info-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.75rem;
            padding-bottom: 0.75rem;
            border-bottom: 1px solid #ecf0f1;
        }
        
        .info-item:last-child {
            margin-bottom: 0;
            padding-bottom: 0;
            border-bottom: none;
        }
        
        .info-label {
            font-weight: 500;
            color: #7f8c8d;
            flex: 1;
        }
        
        .info-value {
            font-weight: 600;
            color: #2c3e50;
            text-align: right;
        }
        
        .info-value.stock-value {
            font-size: 1.1rem;
            color: #667eea;
        }
        
        .product-actions-view {
            display: flex;
            gap: 1rem;
            justify-content: center;
            flex-wrap: wrap;
        }
        
        /* Modal de movimiento */
        .product-info-banner {
            background: linear-gradient(135deg, #f093fb, #f5576c);
            color: white;
            padding: 1rem 1.5rem;
            margin: 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .product-name {
            font-size: 1.1rem;
            font-weight: 600;
        }
        
        .product-stock {
            font-size: 0.9rem;
            opacity: 0.9;
        }
        
        /* Animaciones */
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes slideInDown {
            from {
                transform: translateY(-50px);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }
        
        /* Responsive */
        @media (max-width: 768px) {
            .modal-content {
                width: 95%;
                margin: 10% auto;
            }
            
            .form-grid {
                grid-template-columns: 1fr;
            }
            
            .product-info-grid {
                grid-template-columns: 1fr;
            }
            
            .product-actions-view {
                flex-direction: column;
            }
            
            .product-info-banner {
                flex-direction: column;
                gap: 0.5rem;
                text-align: center;
            }
        }
        
        .text-center {
            text-align: center;
        }
        
        .text-success {
            color: #27ae60;
        }
        
        .text-danger {
            color: #e74c3c;
        }
    </style>
`;

// Agregar estilos al head
document.head.insertAdjacentHTML('beforeend', notificationStyles);
