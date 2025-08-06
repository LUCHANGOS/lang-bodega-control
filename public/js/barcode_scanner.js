// Sistema de Manejo de Códigos de Barras USB HID
class BarcodeScanner {
    constructor() {
        this.scanBuffer = '';
        this.scanTimeout = null;
        this.scanDelay = 100; // Tiempo en ms para detectar fin de escaneo
        this.isScanning = false;
        this.callbacks = {};
        this.enableScanning = true;
        
        this.initializeScanner();
        this.setupScannerUI();
    }

    initializeScanner() {
        // Detectar entrada de pistola de código de barras
        document.addEventListener('keydown', (e) => {
            if (!this.enableScanning) return;
            
            // La pistola de código de barras actúa como un teclado HID
            // Generalmente envía los datos muy rápido seguido de Enter
            
            if (e.key === 'Enter' && this.isScanning && this.scanBuffer.length > 0) {
                // Fin del escaneo, procesar código de barras
                this.processBarcodeInput(this.scanBuffer);
                this.resetScanBuffer();
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            
            // Detectar si es entrada de pistola (caracteres rápidos)
            if (this.isAlphaNumeric(e.key) || this.isNumeric(e.key)) {
                // Verificar si no hay un input activo que tenga foco
                const activeElement = document.activeElement;
                const isInputField = activeElement && (
                    activeElement.tagName === 'INPUT' || 
                    activeElement.tagName === 'TEXTAREA' ||
                    activeElement.contentEditable === 'true'
                );
                
                // Si no hay input activo o si hay un campo específico para códigos de barras
                if (!isInputField || activeElement.classList.contains('barcode-input')) {
                    this.handleBarcodeChar(e.key);
                    if (!activeElement.classList.contains('barcode-input')) {
                        e.preventDefault();
                        e.stopPropagation();
                    }
                }
            }
        });

        // También detectar input rápido (típico de pistolas)
        document.addEventListener('input', (e) => {
            if (!this.enableScanning) return;
            
            const target = e.target;
            if (target && target.classList.contains('barcode-input')) {
                const value = target.value;
                // Si el valor tiene más de 8 caracteres, probablemente es un código de barras
                if (value.length >= 8) {
                    setTimeout(() => {
                        this.processBarcodeInput(value);
                    }, 50);
                }
            }
        });

        console.log('📱 Scanner de códigos de barras USB inicializado');
    }

    setupScannerUI() {
        // Crear indicador visual de escaneo
        const scannerIndicator = document.createElement('div');
        scannerIndicator.id = 'barcode-scanner-indicator';
        scannerIndicator.className = 'scanner-indicator hidden';
        scannerIndicator.innerHTML = `
            <div class="scanner-content">
                <i class="fas fa-barcode"></i>
                <span>Escaneando...</span>
            </div>
        `;
        
        // Agregar estilos CSS
        const style = document.createElement('style');
        style.textContent = `
            .scanner-indicator {
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(46, 204, 113, 0.9);
                color: white;
                padding: 10px 20px;
                border-radius: 5px;
                z-index: 10000;
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 14px;
                transition: all 0.3s ease;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            }
            
            .scanner-indicator.hidden {
                opacity: 0;
                transform: translateX(100%);
            }
            
            .scanner-indicator.error {
                background: rgba(231, 76, 60, 0.9);
            }
            
            .scanner-content {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .barcode-input {
                border: 2px solid #3498db !important;
                box-shadow: 0 0 5px rgba(52, 152, 219, 0.5) !important;
            }
            
            .barcode-result {
                background: rgba(46, 204, 113, 0.1);
                border: 2px solid #2ecc71;
                padding: 10px;
                border-radius: 5px;
                margin: 10px 0;
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(scannerIndicator);
        
        this.indicator = scannerIndicator;
    }

    handleBarcodeChar(char) {
        if (!this.isScanning) {
            this.isScanning = true;
            this.showScannerIndicator();
        }
        
        this.scanBuffer += char;
        
        // Resetear timeout para detectar fin de escaneo
        clearTimeout(this.scanTimeout);
        this.scanTimeout = setTimeout(() => {
            if (this.scanBuffer.length > 0) {
                this.processBarcodeInput(this.scanBuffer);
                this.resetScanBuffer();
            }
        }, this.scanDelay);
    }

    processBarcodeInput(barcode) {
        console.log('🔍 Código de barras escaneado:', barcode);
        
        // Limpiar y validar código de barras
        const cleanBarcode = barcode.trim();
        
        if (cleanBarcode.length < 4) {
            this.showError('Código de barras muy corto');
            return;
        }
        
        // Buscar producto por código de barras
        const product = erpDB.searchByBarcode(cleanBarcode);
        
        if (product) {
            this.showSuccess(`Producto encontrado: ${product.name}`);
            this.triggerCallbacks('product_found', { product, barcode: cleanBarcode });
            
            // Autocompletar campos si están presentes
            this.autofillProductFields(product);
        } else {
            // También buscar por código LANG
            const productByCode = erpDB.getProductByCode(cleanBarcode);
            if (productByCode) {
                this.showSuccess(`Producto encontrado: ${productByCode.name}`);
                this.triggerCallbacks('product_found', { product: productByCode, barcode: cleanBarcode });
                this.autofillProductFields(productByCode);
            } else {
                this.showError(`Producto no encontrado: ${cleanBarcode}`);
                this.triggerCallbacks('product_not_found', { barcode: cleanBarcode });
            }
        }
        
        // Ejecutar callbacks específicos según la sección activa
        const activeSection = this.getActiveSection();
        if (activeSection && this.callbacks[activeSection]) {
            this.callbacks[activeSection](cleanBarcode, product || productByCode);
        }
    }

    autofillProductFields(product) {
        // Autocompletar campos comunes
        const fields = {
            'productCode': product.code,
            'productBarcode': product.barcode,
            'productName': product.name,
            'productId': product.id,
            'searchInput': product.code + ' - ' + product.name
        };
        
        Object.entries(fields).forEach(([fieldId, value]) => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.value = value;
                // Disparar evento change para que otros scripts detecten el cambio
                field.dispatchEvent(new Event('change', { bubbles: true }));
                field.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });
        
        // Buscar campos con clase barcode-input
        const barcodeInputs = document.querySelectorAll('.barcode-input');
        barcodeInputs.forEach(input => {
            if (input.value === '' || input.dataset.autofill === 'true') {
                input.value = product.code;
                input.dispatchEvent(new Event('change', { bubbles: true }));
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });
    }

    showScannerIndicator() {
        this.indicator.classList.remove('hidden', 'error');
        this.indicator.querySelector('span').textContent = 'Escaneando...';
    }

    showSuccess(message) {
        this.indicator.classList.remove('hidden', 'error');
        this.indicator.querySelector('span').textContent = message;
        
        setTimeout(() => {
            this.hideScannerIndicator();
        }, 2000);
    }

    showError(message) {
        this.indicator.classList.remove('hidden');
        this.indicator.classList.add('error');
        this.indicator.querySelector('span').textContent = message;
        
        setTimeout(() => {
            this.hideScannerIndicator();
        }, 3000);
    }

    hideScannerIndicator() {
        this.indicator.classList.add('hidden');
    }

    resetScanBuffer() {
        this.scanBuffer = '';
        this.isScanning = false;
        clearTimeout(this.scanTimeout);
        setTimeout(() => {
            this.hideScannerIndicator();
        }, 1000);
    }

    isAlphaNumeric(str) {
        return /^[a-zA-Z0-9]$/.test(str);
    }

    isNumeric(str) {
        return /^[0-9]$/.test(str);
    }

    getActiveSection() {
        // Detectar sección activa del dashboard
        const activeNav = document.querySelector('.nav-btn.active');
        return activeNav ? activeNav.dataset.section : null;
    }

    // Sistema de callbacks para diferentes secciones
    registerCallback(section, callback) {
        this.callbacks[section] = callback;
    }

    triggerCallbacks(event, data) {
        if (this.callbacks[event]) {
            this.callbacks[event](data);
        }
    }

    // Métodos públicos para control del scanner
    enableScanner() {
        this.enableScanning = true;
        console.log('✅ Scanner habilitado');
    }

    disableScanner() {
        this.enableScanning = false;
        this.resetScanBuffer();
        console.log('❌ Scanner deshabilitado');
    }

    // Método para probar el scanner manualmente
    simulateScan(barcode) {
        console.log('🧪 Simulando escaneo:', barcode);
        this.processBarcodeInput(barcode);
    }
}

// Inicializar scanner cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    // Esperar un poco para que se cargue el ERP
    setTimeout(() => {
        window.barcodeScanner = new BarcodeScanner();
        
        // Registrar callbacks para diferentes secciones
        window.barcodeScanner.registerCallback('inventory', (barcode, product) => {
            if (product && typeof window.loadProducts === 'function') {
                // Actualizar tabla de productos después del escaneo
                window.loadProducts();
                
                // Resaltar el producto encontrado
                setTimeout(() => {
                    const productRow = document.querySelector(`tr[data-product-id="${product.id}"]`);
                    if (productRow) {
                        productRow.style.backgroundColor = '#2ecc71';
                        productRow.style.color = 'white';
                        setTimeout(() => {
                            productRow.style.backgroundColor = '';
                            productRow.style.color = '';
                        }, 3000);
                    }
                }, 500);
            }
        });
        
        window.barcodeScanner.registerCallback('movements', (barcode, product) => {
            // Lógica específica para movimientos
            if (product) {
                console.log('Producto para movimiento:', product);
            }
        });
        
        console.log('📱 Sistema de códigos de barras listo');
    }, 1000);
});

// Función auxiliar para marcar campos como campos de código de barras
window.markAsBarcodeInput = (elementId) => {
    const element = document.getElementById(elementId);
    if (element) {
        element.classList.add('barcode-input');
        element.setAttribute('data-autofill', 'true');
        element.placeholder = element.placeholder || 'Escanee código de barras o ingrese manualmente';
    }
};

// Exportar para uso global
window.BarcodeScanner = BarcodeScanner;
