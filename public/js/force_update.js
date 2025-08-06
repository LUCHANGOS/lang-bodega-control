// Script para forzar actualización completa del sistema
console.log('🔄 Iniciando actualización forzada del sistema...');

// Limpiar todos los datos existentes
localStorage.removeItem('bodega_users');
localStorage.removeItem('bodega_categories');
localStorage.removeItem('bodega_inventory');
localStorage.removeItem('bodega_movements');
localStorage.removeItem('bodega_suppliers');
localStorage.removeItem('token');
localStorage.removeItem('username');
localStorage.removeItem('userInfo');
localStorage.removeItem('loginTime');

console.log('✅ LocalStorage limpiado completamente');
console.log('🔄 Recarga la página para ver los cambios');

// Mostrar mensaje al usuario
if (typeof window !== 'undefined') {
    alert('Sistema actualizado. La página se recargará automáticamente.');
    setTimeout(() => {
        window.location.reload();
    }, 1000);
}
