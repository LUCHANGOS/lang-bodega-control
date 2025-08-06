document.addEventListener('DOMContentLoaded', () => {
    const reportButtons = document.querySelectorAll('.report-btn');
    const token = localStorage.getItem('token');

    // Manejar clicks en botones de reportes
    reportButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const reportType = button.dataset.report;
            
            // Mostrar estado de carga
            const originalText = button.innerHTML;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';
            button.disabled = true;

            try {
                await generateReport(reportType);
            } catch (error) {
                console.error('Error generando reporte:', error);
                showNotification('Error al generar el reporte', 'error');
            } finally {
                // Restaurar botón
                button.innerHTML = originalText;
                button.disabled = false;
            }
        });
    });

    // Función para generar reportes
    const generateReport = async (reportType) => {
        let endpoint;
        let filename;

        switch (reportType) {
            case 'inventory-full':
                endpoint = '/api/reports/inventory-full';
                filename = `inventario_completo_${new Date().toISOString().split('T')[0]}.pdf`;
                break;
            case 'daily-movements':
                endpoint = '/api/reports/daily-movements';
                filename = `movimientos_diarios_${new Date().toISOString().split('T')[0]}.pdf`;
                break;
            case 'low-stock':
                endpoint = '/api/reports/low-stock';
                filename = `stock_bajo_${new Date().toISOString().split('T')[0]}.pdf`;
                break;
            default:
                throw new Error('Tipo de reporte no válido');
        }

        try {
            const response = await fetch(endpoint, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            // Descargar el archivo PDF
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = filename;
            
            document.body.appendChild(a);
            a.click();
            
            // Limpiar
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            showNotification('Reporte generado y descargado exitosamente', 'success');

        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    };

    // Función para mostrar notificaciones (si no está definida)
    if (typeof showNotification === 'undefined') {
        window.showNotification = (message, type = 'info') => {
            const notification = document.getElementById('notification');
            const notificationMessage = document.getElementById('notificationMessage');
            
            if (notification && notificationMessage) {
                notificationMessage.textContent = message;
                notification.className = `notification ${type}`;
                notification.classList.remove('hidden');

                setTimeout(() => {
                    notification.classList.add('hidden');
                }, 3000);
            } else {
                // Fallback a alert si no existe el elemento de notificación
                alert(message);
            }
        };
    }

    // Agregar funcionalidad de reportes automáticos (opcional)
    const checkAutoReports = () => {
        const now = new Date();
        const hour = now.getHours();
        
        // Generar reporte diario automáticamente a las 18:00 (6 PM)
        if (hour === 18 && !localStorage.getItem('daily-report-generated-' + now.toDateString())) {
            generateReport('daily-movements').then(() => {
                localStorage.setItem('daily-report-generated-' + now.toDateString(), 'true');
                showNotification('Reporte diario generado automáticamente', 'info');
            }).catch(err => {
                console.error('Error generando reporte automático:', err);
            });
        }
    };

    // Verificar reportes automáticos cada hora
    setInterval(checkAutoReports, 3600000); // 1 hora = 3600000 ms
    
    // Verificar inmediatamente al cargar
    checkAutoReports();
});
