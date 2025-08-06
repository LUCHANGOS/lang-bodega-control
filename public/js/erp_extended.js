// ERP Extended Functionality - Controlador para las secciones adicionales
class ERPExtended {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.currentVoucherNumber = 1000;
        this.selectedProduct = null;
        this.voucherItems = [];
        this.reportCharts = {};
        this.currentKardexProduct = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.generateVoucherNumber();
        console.log('ERP Extended inicializado correctamente');
    }

    setupEventListeners() {
        // Movements section
        const addMovementBtn = document.getElementById('addMovementBtn');
        if (addMovementBtn) {
            addMovementBtn.addEventListener('click', () => this.showAddMovementModal());
        }

        // Vouchers section
        const createVoucherBtn = document.getElementById('createVoucherBtn');
        if (createVoucherBtn) {
            createVoucherBtn.addEventListener('click', () => this.showCreateVoucherModal());
        }

        const addVoucherItem = document.getElementById('addVoucherItem');
        if (addVoucherItem) {
            addVoucherItem.addEventListener('click', () => this.addVoucherItem());
        }

        const previewVoucherBtn = document.getElementById('previewVoucherBtn');
        if (previewVoucherBtn) {
            previewVoucherBtn.addEventListener('click', () => this.previewVoucher());
        }

        // Forms
        const addMovementForm = document.getElementById('addMovementForm');
        if (addMovementForm) {
            addMovementForm.addEventListener('submit', (e) => this.handleAddMovement(e));
        }

        const createVoucherForm = document.getElementById('createVoucherForm');
        if (createVoucherForm) {
            createVoucherForm.addEventListener('submit', (e) => this.handleCreateVoucher(e));
        }

        // Product search
        const searchProductBtn = document.querySelector('.search-product-btn');
        if (searchProductBtn) {
            searchProductBtn.addEventListener('click', () => this.showProductSearchModal());
        }

        const productSearchInput = document.getElementById('productSearchInput');
        if (productSearchInput) {
            productSearchInput.addEventListener('input', (e) => this.searchProducts(e.target.value));
        }

        const movementProductCode = document.getElementById('movementProductCode');
        if (movementProductCode) {
            movementProductCode.addEventListener('blur', (e) => this.searchProductByCode(e.target.value));
        }

        // Report tabs
        const reportTabs = document.querySelectorAll('.report-tab');
        reportTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const reportType = tab.getAttribute('data-report');
                this.switchReport(reportType);
            });
        });

        // Kardex search
        const kardexSearch = document.getElementById('kardexSearch');
        if (kardexSearch) {
            kardexSearch.addEventListener('input', (e) => this.searchKardexProduct(e.target.value));
        }

        const kardexPeriod = document.getElementById('kardexPeriod');
        if (kardexPeriod) {
            kardexPeriod.addEventListener('change', (e) => this.updateKardexChart(e.target.value));
        }

        // Date filters
        this.setupDateFilters();
    }

    setupDateFilters() {
        // Set default dates
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        
        const dateFromInputs = document.querySelectorAll('#movementDateFrom, #reportDateFrom');
        const dateToInputs = document.querySelectorAll('#movementDateTo, #reportDateTo');
        
        dateFromInputs.forEach(input => {
            if (input) input.valueAsDate = firstDayOfMonth;
        });
        
        dateToInputs.forEach(input => {
            if (input) input.valueAsDate = today;
        });
    }

    // ============ MOVEMENTS SECTION ============

    showAddMovementModal() {
        this.loadProjectsForSelect('movementProject');
        this.loadLocationsForSelect('movementLocation');
        
        // Set current datetime
        const now = new Date();
        const datetime = now.toISOString().slice(0, 16);
        document.getElementById('movementDateTime').value = datetime;
        
        this.dashboard.showModal('addMovementModal');
    }

    async handleAddMovement(e) {
        e.preventDefault();
        
        try {
            const formData = new FormData(e.target);
            const movementData = {
                id: Date.now().toString(),
                tipo: document.getElementById('movementType').value,
                fecha: document.getElementById('movementDateTime').value,
                productId: this.selectedProduct ? this.selectedProduct.id : null,
                cantidad: parseFloat(document.getElementById('movementQuantity').value),
                proyectoId: document.getElementById('movementProject').value || null,
                ubicacion: document.getElementById('movementLocation').value || null,
                motivo: document.getElementById('movementReason').value,
                autorizadoPor: document.getElementById('movementAuthorizer').value,
                usuario: this.dashboard.currentUser.usuario,
                estado: 'completado',
                timestamp: new Date().toISOString()
            };

            if (!this.selectedProduct) {
                throw new Error('Debe seleccionar un producto');
            }

            // Validar stock para salidas
            if (movementData.tipo === 'salida' && this.selectedProduct.stock < movementData.cantidad) {
                throw new Error('Stock insuficiente para realizar la salida');
            }

            // Guardar movimiento
            await this.dashboard.saveMovement(movementData);

            // Actualizar stock del producto
            await this.updateProductStock(this.selectedProduct.id, movementData.tipo, movementData.cantidad);

            this.dashboard.showNotification('Movimiento registrado exitosamente', 'success');
            this.dashboard.closeModal('addMovementModal');
            
            // Reset form
            e.target.reset();
            this.selectedProduct = null;
            document.getElementById('selectedProduct').classList.remove('active');
            
            // Refresh data
            await this.dashboard.loadData();
            this.loadMovements();

        } catch (error) {
            this.dashboard.showNotification(`Error: ${error.message}`, 'error');
        }
    }

    async updateProductStock(productId, movementType, quantity) {
        const products = await ERPDatabase.getProducts();
        const product = products.find(p => p.id === productId);
        
        if (product) {
            if (movementType === 'entrada' || movementType === 'ajuste') {
                product.stock = (product.stock || 0) + quantity;
            } else if (movementType === 'salida') {
                product.stock = Math.max(0, (product.stock || 0) - quantity);
            }
            
            await ERPDatabase.saveProduct(product);
        }
    }

    async loadMovements() {
        const movements = await ERPDatabase.getMovements();
        const products = await ERPDatabase.getProducts();
        const projects = await ERPDatabase.getProjects();
        
        this.updateMovementStats(movements);
        this.loadMovementFilters(movements, projects);
        this.displayMovementsTable(movements, products, projects);
    }

    updateMovementStats(movements) {
        const entries = movements.filter(m => m.tipo === 'entrada').length;
        const exits = movements.filter(m => m.tipo === 'salida').length;
        const transfers = movements.filter(m => m.tipo === 'transferencia').length;
        const adjustments = movements.filter(m => m.tipo === 'ajuste').length;

        this.dashboard.updateElement('totalEntries', entries);
        this.dashboard.updateElement('totalExits', exits);
        this.dashboard.updateElement('totalTransfers', transfers);
        this.dashboard.updateElement('totalAdjustments', adjustments);
    }

    loadMovementFilters(movements, projects) {
        // Load project filter
        const projectFilter = document.getElementById('movementProjectFilter');
        if (projectFilter) {
            const projectOptions = projects.map(p => 
                `<option value="${p.id}">${p.nombre}</option>`
            ).join('');
            projectFilter.innerHTML = '<option value="">Todos los proyectos</option>' + projectOptions;
        }

        // Load user filter
        const userFilter = document.getElementById('movementUserFilter');
        if (userFilter) {
            const users = [...new Set(movements.map(m => m.usuario))].filter(Boolean);
            const userOptions = users.map(u => 
                `<option value="${u}">${u}</option>`
            ).join('');
            userFilter.innerHTML = '<option value="">Todos los usuarios</option>' + userOptions;
        }
    }

    displayMovementsTable(movements, products, projects) {
        const tbody = document.getElementById('movementsTableBody');
        if (!tbody) return;

        tbody.innerHTML = movements.map(movement => {
            const product = products.find(p => p.id === movement.productId);
            const project = projects.find(p => p.id === movement.proyectoId);
            
            const statusClass = movement.estado === 'completado' ? 'status-success' :
                               movement.estado === 'pendiente' ? 'status-warning' : 'status-danger';

            return `
                <tr>
                    <td>${new Date(movement.fecha).toLocaleDateString()}</td>
                    <td><span class="movement-type ${movement.tipo}">${movement.tipo.toUpperCase()}</span></td>
                    <td>${product ? product.nombre : 'Producto eliminado'}</td>
                    <td>${movement.cantidad} ${product ? product.unidad : ''}</td>
                    <td>${project ? project.nombre : '-'}</td>
                    <td>${movement.usuario}</td>
                    <td><span class="status-badge ${statusClass}">${movement.estado}</span></td>
                    <td>${movement.motivo || '-'}</td>
                    <td>
                        <button class="btn-small btn-primary" onclick="erpExtended.viewMovement('${movement.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-small btn-secondary" onclick="erpExtended.editMovement('${movement.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // ============ VOUCHERS SECTION ============

    showCreateVoucherModal() {
        this.generateVoucherNumber();
        this.loadProjectsForSelect('voucherProjectSelect');
        
        // Set today's date
        document.getElementById('voucherDate').valueAsDate = new Date();
        
        // Clear items
        this.voucherItems = [];
        document.getElementById('voucherItemsList').innerHTML = '';
        
        this.dashboard.showModal('createVoucherModal');
    }

    generateVoucherNumber() {
        const voucherNum = document.getElementById('voucherNum');
        if (voucherNum) {
            voucherNum.value = `VR-${this.currentVoucherNumber++}`;
        }
    }

    addVoucherItem() {
        const itemId = Date.now().toString();
        const itemHtml = `
            <div class="voucher-item" data-item-id="${itemId}">
                <input type="text" placeholder="Código del producto" class="item-code barcode-input" onblur="erpExtended.validateProductCode(this, '${itemId}')">
                <input type="text" placeholder="Descripción" class="item-description" readonly>
                <input type="number" placeholder="Cantidad" class="item-quantity" min="1" step="0.01">
                <input type="text" placeholder="Unidad" class="item-unit" readonly>
                <button type="button" class="remove-item-btn" onclick="erpExtended.removeVoucherItem('${itemId}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        document.getElementById('voucherItemsList').insertAdjacentHTML('beforeend', itemHtml);
    }

    removeVoucherItem(itemId) {
        const item = document.querySelector(`[data-item-id="${itemId}"]`);
        if (item) {
            item.remove();
        }
    }

    async validateProductCode(input, itemId) {
        const code = input.value.trim();
        if (!code) return;

        const products = await ERPDatabase.getProducts();
        const product = products.find(p => 
            p.codigo === code || p.codigoBarras === code || p.id === code
        );

        const item = document.querySelector(`[data-item-id="${itemId}"]`);
        if (product && item) {
            item.querySelector('.item-description').value = product.nombre;
            item.querySelector('.item-unit').value = product.unidad;
            
            // Validate stock
            const quantityInput = item.querySelector('.item-quantity');
            quantityInput.addEventListener('blur', () => {
                const quantity = parseFloat(quantityInput.value) || 0;
                if (quantity > product.stock) {
                    this.dashboard.showNotification(`Stock insuficiente. Disponible: ${product.stock}`, 'warning');
                    quantityInput.style.borderColor = '#e74c3c';
                } else {
                    quantityInput.style.borderColor = '#27ae60';
                }
            });
        } else {
            this.dashboard.showNotification('Producto no encontrado', 'warning');
            input.style.borderColor = '#e74c3c';
        }
    }

    async handleCreateVoucher(e) {
        e.preventDefault();

        try {
            // Collect voucher data
            const voucherData = {
                id: Date.now().toString(),
                numero: document.getElementById('voucherNum').value,
                fecha: document.getElementById('voucherDate').value,
                proyectoId: document.getElementById('voucherProjectSelect').value,
                ceco: document.getElementById('voucherCECOInput').value,
                responsable: document.getElementById('voucherResponsibleInput').value,
                autorizadoPor: document.getElementById('voucherAuthorizerInput').value,
                observaciones: document.getElementById('voucherObservations').value,
                estado: 'pendiente',
                items: [],
                creadoPor: this.dashboard.currentUser.usuario,
                fechaCreacion: new Date().toISOString()
            };

            // Collect items
            const itemElements = document.querySelectorAll('.voucher-item');
            for (let itemEl of itemElements) {
                const code = itemEl.querySelector('.item-code').value;
                const description = itemEl.querySelector('.item-description').value;
                const quantity = parseFloat(itemEl.querySelector('.item-quantity').value) || 0;
                const unit = itemEl.querySelector('.item-unit').value;

                if (code && description && quantity > 0) {
                    voucherData.items.push({
                        codigo: code,
                        descripcion: description,
                        cantidad: quantity,
                        unidad: unit
                    });
                }
            }

            if (voucherData.items.length === 0) {
                throw new Error('Debe agregar al menos un ítem al vale');
            }

            // Save voucher
            await ERPDatabase.saveVoucher(voucherData);

            this.dashboard.showNotification('Vale creado exitosamente', 'success');
            this.dashboard.closeModal('createVoucherModal');
            
            // Refresh vouchers
            this.loadVouchers();

        } catch (error) {
            this.dashboard.showNotification(`Error: ${error.message}`, 'error');
        }
    }

    previewVoucher() {
        const template = document.getElementById('voucher-template');
        const newWindow = window.open('', '_blank', 'width=800,height=600');
        
        newWindow.document.write(`
            <html>
                <head>
                    <title>Vista Previa - Vale de Retiro</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
                        ${document.querySelector('style').textContent}
                    </style>
                </head>
                <body>
                    ${template.innerHTML}
                    <script>
                        window.onload = function() {
                            window.print();
                        };
                    </script>
                </body>
            </html>
        `);
        
        newWindow.document.close();
    }

    async loadVouchers() {
        const vouchers = await ERPDatabase.getVouchers();
        const projects = await ERPDatabase.getProjects();
        
        this.updateVoucherStats(vouchers);
        this.displayVouchersGrid(vouchers, projects);
    }

    updateVoucherStats(vouchers) {
        const pending = vouchers.filter(v => v.estado === 'pendiente').length;
        const approved = vouchers.filter(v => v.estado === 'aprobado').length;
        const delivered = vouchers.filter(v => v.estado === 'entregado').length;
        
        this.dashboard.updateElement('pendingVouchers', pending);
        this.dashboard.updateElement('approvedVouchers', approved);
        this.dashboard.updateElement('deliveredVouchers', delivered);
        
        // Calculate month value (simulated)
        const monthValue = vouchers.filter(v => {
            const vDate = new Date(v.fecha);
            const now = new Date();
            return vDate.getMonth() === now.getMonth() && vDate.getFullYear() === now.getFullYear();
        }).length * 1500; // Approximate value per voucher
        
        this.dashboard.updateElement('monthVoucherValue', `$${monthValue.toLocaleString()}`);
    }

    displayVouchersGrid(vouchers, projects) {
        const grid = document.getElementById('vouchersGrid');
        if (!grid) return;

        grid.innerHTML = vouchers.map(voucher => {
            const project = projects.find(p => p.id === voucher.proyectoId);
            const statusClass = voucher.estado === 'entregado' ? 'status-success' :
                               voucher.estado === 'aprobado' ? 'status-info' : 'status-warning';

            return `
                <div class="voucher-card">
                    <div class="voucher-header">
                        <div class="voucher-number">${voucher.numero}</div>
                        <div class="voucher-date">${new Date(voucher.fecha).toLocaleDateString()}</div>
                    </div>
                    <div class="voucher-details">
                        <p><strong>Proyecto:</strong> ${project ? project.nombre : 'N/A'}</p>
                        <p><strong>CECO:</strong> ${voucher.ceco}</p>
                        <p><strong>Responsable:</strong> ${voucher.responsable}</p>
                        <p><strong>Estado:</strong> <span class="status-badge ${statusClass}">${voucher.estado.toUpperCase()}</span></p>
                    </div>
                    <div class="voucher-items-summary">
                        <strong>${voucher.items.length} ítem(s)</strong> - 
                        ${voucher.items.slice(0, 2).map(item => item.descripcion).join(', ')}
                        ${voucher.items.length > 2 ? '...' : ''}
                    </div>
                    <div class="voucher-actions">
                        <button class="btn-small btn-primary" onclick="erpExtended.printVoucher('${voucher.id}')">
                            <i class="fas fa-print"></i> Imprimir
                        </button>
                        <button class="btn-small btn-secondary" onclick="erpExtended.editVoucher('${voucher.id}')">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn-small btn-success" onclick="erpExtended.deliverVoucher('${voucher.id}')">
                            <i class="fas fa-check"></i> Entregar
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // ============ REPORTS SECTION ============

    switchReport(reportType) {
        // Update active tab
        document.querySelectorAll('.report-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-report="${reportType}"]`).classList.add('active');

        // Show corresponding panel
        document.querySelectorAll('.report-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        document.getElementById(`${reportType}-report`).classList.add('active');

        // Load report data
        this.loadReport(reportType);
    }

    async loadReport(reportType) {
        const data = await this.dashboard.loadData();
        
        switch (reportType) {
            case 'inventory':
                this.loadInventoryReport(data);
                break;
            case 'movements':
                this.loadMovementsReport(data);
                break;
            case 'projects':
                this.loadProjectsReport(data);
                break;
            default:
                console.log(`Report ${reportType} not implemented yet`);
        }
    }

    loadInventoryReport(data) {
        const products = data.products || [];
        
        // Calculate summary values
        const totalValue = products.reduce((sum, p) => sum + (p.stock * (p.valor || 10)), 0);
        const activeProducts = products.filter(p => p.stock > 0).length;
        const categories = [...new Set(products.map(p => p.categoria))].length;
        const averageRotation = Math.random() * 100; // Simulated
        
        this.dashboard.updateElement('totalInventoryValue', `$${totalValue.toLocaleString()}`);
        this.dashboard.updateElement('activeProductsCount', activeProducts);
        this.dashboard.updateElement('categoriesCount', categories);
        this.dashboard.updateElement('averageRotation', `${averageRotation.toFixed(1)}%`);
        
        // Load charts
        this.loadInventoryCharts(products);
        
        // Load table
        this.loadInventoryReportTable(products);
    }

    loadInventoryCharts(products) {
        // Stock by category chart
        const categoryData = {};
        products.forEach(product => {
            const category = product.categoria || 'Sin categoría';
            categoryData[category] = (categoryData[category] || 0) + (product.stock || 0);
        });

        const ctx1 = document.getElementById('stockByCategoryChart');
        if (ctx1 && this.reportCharts.stockByCategory) {
            this.reportCharts.stockByCategory.destroy();
        }

        this.reportCharts.stockByCategory = new Chart(ctx1, {
            type: 'pie',
            data: {
                labels: Object.keys(categoryData),
                datasets: [{
                    data: Object.values(categoryData),
                    backgroundColor: ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe']
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

        // Critical stock chart
        const criticalProducts = products.filter(p => p.stock <= (p.stockMinimo || 10));
        
        const ctx2 = document.getElementById('criticalStockChart');
        if (ctx2 && this.reportCharts.criticalStock) {
            this.reportCharts.criticalStock.destroy();
        }

        this.reportCharts.criticalStock = new Chart(ctx2, {
            type: 'bar',
            data: {
                labels: criticalProducts.slice(0, 10).map(p => p.nombre.substring(0, 15) + '...'),
                datasets: [{
                    label: 'Stock Actual',
                    data: criticalProducts.slice(0, 10).map(p => p.stock),
                    backgroundColor: '#e74c3c'
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

    // ============ KARDEX SECTION ============

    async searchKardexProduct(searchTerm) {
        if (searchTerm.length < 2) return;
        
        const products = await ERPDatabase.getProducts();
        const matches = products.filter(p => 
            p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.codigo.includes(searchTerm) ||
            (p.codigoBarras && p.codigoBarras.includes(searchTerm))
        );

        if (matches.length === 1) {
            this.selectKardexProduct(matches[0]);
        }
    }

    selectKardexProduct(product) {
        this.currentKardexProduct = product;
        
        // Update product info display
        document.getElementById('kardexProductName').textContent = product.nombre;
        document.getElementById('kardexProductCode').textContent = product.codigo || product.id;
        document.getElementById('kardexProductCategory').textContent = product.categoria || 'Sin categoría';
        document.getElementById('kardexCurrentStock').textContent = product.stock || 0;
        
        // Load kardex data
        this.loadKardexData(product.id);
    }

    async loadKardexData(productId) {
        const movements = await ERPDatabase.getMovements();
        const productMovements = movements.filter(m => m.productId === productId);
        
        // Calculate summary
        const totalEntries = productMovements.filter(m => m.tipo === 'entrada').reduce((sum, m) => sum + m.cantidad, 0);
        const totalExits = productMovements.filter(m => m.tipo === 'salida').reduce((sum, m) => sum + m.cantidad, 0);
        const rotation = totalExits > 0 ? Math.round(totalExits / (this.currentKardexProduct.stock || 1)) : 0;
        
        const lastMovement = productMovements.sort((a, b) => new Date(b.fecha) - new Date(a.fecha))[0];
        const daysWithoutMovement = lastMovement ? 
            Math.ceil((new Date() - new Date(lastMovement.fecha)) / (1000 * 60 * 60 * 24)) : 0;

        this.dashboard.updateElement('kardexTotalEntries', totalEntries);
        this.dashboard.updateElement('kardexTotalExits', totalExits);
        this.dashboard.updateElement('kardexRotation', `${rotation}x`);
        this.dashboard.updateElement('kardexDaysWithoutMovement', daysWithoutMovement);
        
        // Load chart
        this.loadKardexChart(productMovements);
        
        // Load table
        this.loadKardexTable(productMovements);
    }

    loadKardexChart(movements) {
        const ctx = document.getElementById('kardexChart');
        if (!ctx) return;

        // Calculate running balance
        let balance = 0;
        const chartData = movements
            .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
            .map(movement => {
                if (movement.tipo === 'entrada') {
                    balance += movement.cantidad;
                } else if (movement.tipo === 'salida') {
                    balance -= movement.cantidad;
                }
                return {
                    x: movement.fecha,
                    y: Math.max(0, balance)
                };
            });

        if (this.reportCharts.kardexChart) {
            this.reportCharts.kardexChart.destroy();
        }

        this.reportCharts.kardexChart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Stock',
                    data: chartData,
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Stock'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    async loadKardexTable(movements) {
        const tbody = document.getElementById('kardexTableBody');
        if (!tbody) return;

        const projects = await ERPDatabase.getProjects();
        
        let runningBalance = 0;
        
        tbody.innerHTML = movements
            .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
            .map(movement => {
                const project = projects.find(p => p.id === movement.proyectoId);
                const entrada = movement.tipo === 'entrada' ? movement.cantidad : '';
                const salida = movement.tipo === 'salida' ? movement.cantidad : '';
                
                // Calculate balance (this is simplified - should be calculated chronologically)
                if (movement.tipo === 'entrada') {
                    runningBalance += movement.cantidad;
                } else if (movement.tipo === 'salida') {
                    runningBalance -= movement.cantidad;
                }

                return `
                    <tr>
                        <td>${new Date(movement.fecha).toLocaleDateString()}</td>
                        <td><span class="movement-type ${movement.tipo}">${movement.tipo.toUpperCase()}</span></td>
                        <td>MOV-${movement.id.slice(-6)}</td>
                        <td>${entrada}</td>
                        <td>${salida}</td>
                        <td>${Math.max(0, runningBalance)}</td>
                        <td>${movement.usuario}</td>
                        <td>${project ? project.nombre : '-'}</td>
                        <td>${movement.motivo || '-'}</td>
                    </tr>
                `;
            })
            .join('');
    }

    // ============ UTILITY METHODS ============

    showProductSearchModal() {
        this.dashboard.showModal('productSearchModal');
    }

    async searchProducts(searchTerm) {
        if (searchTerm.length < 2) return;

        const products = await ERPDatabase.getProducts();
        const results = products.filter(p =>
            p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.codigo.includes(searchTerm) ||
            (p.codigoBarras && p.codigoBarras.includes(searchTerm))
        );

        const resultsContainer = document.getElementById('productSearchResults');
        if (resultsContainer) {
            resultsContainer.innerHTML = results.map(product => `
                <div class="product-result" onclick="erpExtended.selectProductFromSearch('${product.id}')">
                    <h5>${product.nombre}</h5>
                    <p>Código: ${product.codigo || product.id} | Stock: ${product.stock} ${product.unidad}</p>
                </div>
            `).join('');
        }
    }

    async selectProductFromSearch(productId) {
        const products = await ERPDatabase.getProducts();
        this.selectedProduct = products.find(p => p.id === productId);
        
        if (this.selectedProduct) {
            document.getElementById('movementProductCode').value = this.selectedProduct.codigo || this.selectedProduct.id;
            document.getElementById('movementUnit').value = this.selectedProduct.unidad;
            
            const selectedProductDiv = document.getElementById('selectedProduct');
            selectedProductDiv.innerHTML = `
                <strong>${this.selectedProduct.nombre}</strong><br>
                Stock: ${this.selectedProduct.stock} ${this.selectedProduct.unidad}
            `;
            selectedProductDiv.classList.add('active');
            
            this.dashboard.closeModal('productSearchModal');
        }
    }

    async searchProductByCode(code) {
        if (!code) return;

        const products = await ERPDatabase.getProducts();
        const product = products.find(p => 
            p.codigo === code || p.codigoBarras === code || p.id === code
        );

        if (product) {
            this.selectProductFromSearch(product.id);
        }
    }

    loadProjectsForSelect(selectId) {
        const select = document.getElementById(selectId);
        if (!select) return;

        ERPDatabase.getProjects().then(projects => {
            const options = projects.map(p => 
                `<option value="${p.id}" data-ceco="${p.ceco}">${p.nombre}</option>`
            ).join('');
            select.innerHTML = '<option value="">Seleccionar proyecto...</option>' + options;
            
            // Add event listener for CECO auto-fill
            select.addEventListener('change', (e) => {
                const selectedOption = e.target.selectedOptions[0];
                if (selectedOption && selectedOption.dataset.ceco) {
                    const cecoInput = document.getElementById('voucherCECOInput');
                    if (cecoInput) {
                        cecoInput.value = selectedOption.dataset.ceco;
                    }
                }
            });
        });
    }

    loadLocationsForSelect(selectId) {
        const select = document.getElementById(selectId);
        if (!select) return;

        const locations = ['Almacén Principal', 'Bodega A', 'Bodega B', 'Área de Producción', 'Patio de Materiales'];
        const options = locations.map(loc => 
            `<option value="${loc}">${loc}</option>`
        ).join('');
        select.innerHTML = '<option value="">Seleccionar ubicación...</option>' + options;
    }

    // ============ PRINT AND EXPORT METHODS ============

    async printVoucher(voucherId) {
        const vouchers = await ERPDatabase.getVouchers();
        const voucher = vouchers.find(v => v.id === voucherId);
        const projects = await ERPDatabase.getProjects();
        const project = projects.find(p => p.id === voucher.proyectoId);

        if (!voucher) return;

        // Fill voucher template
        document.getElementById('voucherNumber').textContent = voucher.numero;
        document.getElementById('voucherDate').textContent = new Date(voucher.fecha).toLocaleDateString();
        document.getElementById('voucherProject').textContent = project ? project.nombre : 'N/A';
        document.getElementById('voucherCECO').textContent = voucher.ceco;
        document.getElementById('voucherResponsible').textContent = voucher.responsable;
        document.getElementById('voucherAuthorizer').textContent = voucher.autorizadoPor;

        const itemsBody = document.getElementById('voucherItemsBody');
        itemsBody.innerHTML = voucher.items.map(item => `
            <tr>
                <td>${item.codigo}</td>
                <td>${item.descripcion}</td>
                <td>${item.cantidad}</td>
                <td>${item.unidad}</td>
                <td>-</td>
            </tr>
        `).join('');

        // Print
        window.print();
    }

    async deliverVoucher(voucherId) {
        const vouchers = await ERPDatabase.getVouchers();
        const voucher = vouchers.find(v => v.id === voucherId);
        
        if (voucher) {
            voucher.estado = 'entregado';
            voucher.fechaEntrega = new Date().toISOString();
            await ERPDatabase.saveVoucher(voucher);
            
            this.dashboard.showNotification('Vale marcado como entregado', 'success');
            this.loadVouchers();
        }
    }

    // Placeholder methods for future implementation
    viewMovement(movementId) {
        console.log('View movement:', movementId);
    }

    editMovement(movementId) {
        console.log('Edit movement:', movementId);
    }

    editVoucher(voucherId) {
        console.log('Edit voucher:', voucherId);
    }

    loadInventoryReportTable(products) {
        const tbody = document.getElementById('inventoryReportTable');
        if (!tbody) return;

        tbody.innerHTML = products.map(product => {
            const stockStatus = this.dashboard.getStockStatus(product);
            const unitValue = product.valor || 10;
            const totalValue = product.stock * unitValue;

            return `
                <tr>
                    <td>${product.nombre}</td>
                    <td>${product.categoria}</td>
                    <td>${product.stock}</td>
                    <td>${product.stockMinimo || 10}</td>
                    <td>$${unitValue.toFixed(2)}</td>
                    <td>$${totalValue.toFixed(2)}</td>
                    <td>${product.ubicacion || 'No definida'}</td>
                    <td><span class="status-badge ${stockStatus.class}">${stockStatus.text}</span></td>
                </tr>
            `;
        }).join('');
    }

    loadMovementsReport(data) {
        const movements = data.movements || [];
        
        const totalEntries = movements.filter(m => m.tipo === 'entrada').length;
        const totalExits = movements.filter(m => m.tipo === 'salida').length;
        const currentMonth = new Date().getMonth();
        const monthlyMovements = movements.filter(m => {
            const movDate = new Date(m.fecha);
            return movDate.getMonth() === currentMonth;
        }).length;

        this.dashboard.updateElement('totalEntriesReport', totalEntries);
        this.dashboard.updateElement('totalExitsReport', totalExits);
        this.dashboard.updateElement('monthlyMovementsReport', monthlyMovements);
        
        // Find most moved product
        const productMovements = {};
        movements.forEach(m => {
            productMovements[m.productId] = (productMovements[m.productId] || 0) + m.cantidad;
        });
        
        const topProductId = Object.keys(productMovements).reduce((a, b) => 
            productMovements[a] > productMovements[b] ? a : b, '');
        
        const topProduct = data.products.find(p => p.id === topProductId);
        this.dashboard.updateElement('topMovedProduct', topProduct ? topProduct.nombre.substring(0, 15) + '...' : '-');
    }

    loadProjectsReport(data) {
        const projects = data.projects || [];
        const movements = data.movements || [];
        
        const activeProjects = projects.filter(p => p.estado === 'activo').length;
        const totalConsumption = movements.filter(m => m.tipo === 'salida').length * 150; // Simulated value
        
        this.dashboard.updateElement('activeProjectsReport', activeProjects);
        this.dashboard.updateElement('totalConsumptionReport', `$${totalConsumption.toLocaleString()}`);
        
        // Find most active project
        const projectMovements = {};
        movements.forEach(m => {
            if (m.proyectoId) {
                projectMovements[m.proyectoId] = (projectMovements[m.proyectoId] || 0) + 1;
            }
        });
        
        const mostActiveProjectId = Object.keys(projectMovements).reduce((a, b) => 
            projectMovements[a] > projectMovements[b] ? a : b, '');
        
        const mostActiveProject = projects.find(p => p.id === mostActiveProjectId);
        this.dashboard.updateElement('mostActiveProject', mostActiveProject ? mostActiveProject.nombre.substring(0, 15) + '...' : '-');
        this.dashboard.updateElement('averageEfficiency', `${Math.floor(Math.random() * 30 + 70)}%`);
    }
}

// Initialize extended functionality when dashboard is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait for main dashboard to be ready
    setTimeout(() => {
        if (window.erp) {
            window.erpExtended = new ERPExtended(window.erp);
        }
    }, 1000);
});

// CSS adicional para estilos específicos
const additionalStyles = `
<style>
.movement-type {
    padding: 0.25rem 0.5rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: uppercase;
}

.movement-type.entrada {
    background: rgba(46, 204, 113, 0.2);
    color: #27ae60;
}

.movement-type.salida {
    background: rgba(231, 76, 60, 0.2);
    color: #c0392b;
}

.movement-type.transferencia {
    background: rgba(243, 156, 18, 0.2);
    color: #e67e22;
}

.movement-type.ajuste {
    background: rgba(155, 89, 182, 0.2);
    color: #8e44ad;
}

.btn-success {
    background: #27ae60;
    color: white;
    border: none;
    padding: 0.375rem 0.75rem;
    border-radius: 3px;
    cursor: pointer;
    font-size: 0.8rem;
}

.btn-success:hover {
    background: #219a52;
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', additionalStyles);
