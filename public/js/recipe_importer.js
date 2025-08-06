// Sistema de Carga de Recetas/Listas de Materiales
// Requiere librerías externas (SheetJS para Excel, PDF.js para PDF)

class RecipeImporter {
    constructor() {
        this.isExcelLibraryLoaded = typeof XLSX !== 'undefined';
        this.isPdfLibraryLoaded = typeof pdfjsLib !== 'undefined';
        
        this.initializeImporter();
    }

    initializeImporter() {
        // Cargar librerías externas si no están presentes
        this.loadExternalLibraries();
        
        const fileInput = document.getElementById('recipeFileInput');
        if (fileInput) {
            fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        }

        console.log('📄 Importador de recetas inicializado');
    }

    loadExternalLibraries() {
        // Cargar SheetJS (XLSX)
        if (!this.isExcelLibraryLoaded) {
            const xlsxScript = document.createElement('script');
            xlsxScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
            xlsxScript.onload = () => {
                this.isExcelLibraryLoaded = true;
                console.log('✅ Librería SheetJS (Excel) cargada');
            };
            document.head.appendChild(xlsxScript);
        }
        
        // Cargar PDF.js
        if (!this.isPdfLibraryLoaded) {
            const pdfjsScript = document.createElement('script');
            pdfjsScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.min.js';
            pdfjsScript.onload = () => {
                this.isPdfLibraryLoaded = true;
                pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js`;
                console.log('✅ Librería PDF.js cargada');
            };
            document.head.appendChild(pdfjsScript);
        }
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const fileType = file.type;
        const fileName = file.name.toLowerCase();

        if (fileName.endsWith('.xlsx') || fileType.includes('spreadsheetml')) {
            if (!this.isExcelLibraryLoaded) {
                alert('La librería para leer Excel aún no se ha cargado. Por favor espera unos segundos y vuelve a intentarlo.');
                return;
            }
            this.parseExcelFile(file);
        } else if (fileName.endsWith('.pdf') || fileType.includes('pdf')) {
            if (!this.isPdfLibraryLoaded) {
                alert('La librería para leer PDF aún no se ha cargado. Por favor espera unos segundos y vuelve a intentarlo.');
                return;
            }
            this.parsePdfFile(file);
        } else {
            alert('Tipo de archivo no soportado. Por favor, selecciona un archivo Excel (.xlsx) o PDF.');
        }
    }

    parseExcelFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const json = XLSX.utils.sheet_to_json(worksheet);

                this.processRecipeData(json);
            } catch (error) {
                console.error('Error al procesar el archivo Excel:', error);
                alert('Error al procesar el archivo Excel. Asegúrate de que el formato sea correcto.');
            }
        };
        reader.readAsArrayBuffer(file);
    }

    async parsePdfFile(file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const pdf = await pdfjsLib.getDocument({ data }).promise;
                let textContent = '';

                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const text = await page.getTextContent();
                    textContent += text.items.map(s => s.str).join(' ');
                }

                // Procesamiento simple del texto del PDF
                const json = this.parseTextToJSON(textContent);
                this.processRecipeData(json);
            } catch (error) {
                console.error('Error al procesar el archivo PDF:', error);
                alert('Error al procesar el archivo PDF. El PDF debe ser de texto y no una imagen.');
            }
        };
        reader.readAsArrayBuffer(file);
    }

    parseTextToJSON(text) {
        // Esta es una función de ejemplo y necesita ser adaptada al formato de tu PDF
        const lines = text.split(/\s*\n\s*/).filter(line => line.trim() !== '');
        const data = [];
        let headers = [];
        
        // Heurística para encontrar la tabla de materiales
        lines.forEach((line, index) => {
            if (line.toLowerCase().includes('item') && line.toLowerCase().includes('código') && line.toLowerCase().includes('descripción')) {
                headers = line.split(/\s{2,}/); // Separar por múltiples espacios
            } else if (headers.length > 0) {
                const values = line.split(/\s{2,}/);
                if (values.length === headers.length) {
                    const row = {};
                    headers.forEach((header, i) => {
                        row[header.toLowerCase()] = values[i];
                    });
                    data.push(row);
                }
            }
        });
        
        return data;
    }

    processRecipeData(data) {
        if (!data || data.length === 0) {
            alert('No se encontraron datos de materiales en el archivo.');
            return;
        }

        // Asumir un formato estándar para el archivo
        const recipe = {
            solicitante: data[0].solicitante || 'No especificado',
            ceco: data[0].ceco || 'No especificado',
            opOt: data[0]['op/ot'] || 'No especificado',
            proyecto: data[0].proyecto || 'No especificado',
            fechaSolicitud: data[0].fecha_solicitud || new Date().toISOString(),
            items: data.map(row => ({
                item: row.item || row.ítem,
                code: row.código || row.codigo,
                description: row.descripción || row.descripcion,
                unit: row.unidad,
                requestedQty: parseFloat(row.cantidad_solicitada) || 0
            }))
        };

        // Validar stock y mostrar resultados
        this.validateRecipeStock(recipe);
        
        // Guardar receta en la base de datos
        erpDB.addRecipe(recipe);
        
        // Emitir evento para que la UI se actualice
        document.dispatchEvent(new CustomEvent('recipe_imported', { detail: recipe }));
    }

    validateRecipeStock(recipe) {
        const recipePreview = document.getElementById('recipe-preview');
        if (!recipePreview) return;
        
        let html = `<h3>Receta Cargada: ${recipe.proyecto}</h3>`;
        html += `
            <p>
                <strong>Solicitante:</strong> ${recipe.solicitante} | 
                <strong>CECO:</strong> ${recipe.ceco} | 
                <strong>OP/OT:</strong> ${recipe.opOt}
            </p>
        `;
        html += `<table class="recipe-table"><thead><tr>
            <th>Ítem</th><th>Código</th><th>Descripción</th>
            <th>Solicitado</th><th>Disponible</th><th>Estado</th>
        </tr></thead><tbody>`;

        let allInStock = true;
        recipe.items.forEach(item => {
            const product = erpDB.getProductByCode(item.code);
            const availableStock = product ? product.currentStock : 0;
            const inStock = availableStock >= item.requestedQty;
            if (!inStock) allInStock = false;

            html += `
                <tr class="${inStock ? 'in-stock' : 'out-of-stock'}">
                    <td>${item.item}</td>
                    <td>${item.code}</td>
                    <td>${item.description}</td>
                    <td>${item.requestedQty} ${item.unit}</td>
                    <td>${availableStock} ${item.unit}</td>
                    <td>
                        <span class="stock-status ${inStock ? 'success' : 'danger'}">
                            <i class="fas ${inStock ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                            ${inStock ? 'En Stock' : 'Stock Insuficiente'}
                        </span>
                    </td>
                </tr>
            `;
        });

        html += `</tbody></table>`;
        html += `
            <div class="recipe-actions">
                <button id="generate-voucher-btn" ${!allInStock ? 'disabled' : ''}>
                    <i class="fas fa-file-invoice"></i> Generar Vale de Retiro
                </button>
            </div>
        `;
        
        recipePreview.innerHTML = html;

        const generateVoucherBtn = document.getElementById('generate-voucher-btn');
        if (generateVoucherBtn) {
            generateVoucherBtn.addEventListener('click', () => this.generateWithdrawalVoucher(recipe));
        }
    }

    generateWithdrawalVoucher(recipe) {
        const voucher = erpDB.createWithdrawalVoucher({
            projectId: recipe.proyecto, // Asumiendo que el nombre del proyecto es el ID
            recipeId: recipe.id,
            items: recipe.items.map(item => ({
                ...item,
                deliveredQty: 0,
                pendingQty: item.requestedQty
            }))
        });
        
        alert(`Vale de retiro ${voucher.voucherNumber} generado exitosamente.`);
        
        // Emitir evento para actualizar la lista de vales
        document.dispatchEvent(new CustomEvent('voucher_created', { detail: voucher }));
    }
}

// Inicializar cuando se carga el DOM
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('recipeFileInput')) {
        window.recipeImporter = new RecipeImporter();
    }
});

