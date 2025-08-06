// Base de datos de usuarios en localStorage
function initializeUsers() {
    if (!localStorage.getItem('bodega_users')) {
        const users = {
            'admin': {
                username: 'admin',
                password: 'admin123',
                fullName: 'Administrador LANG',
                role: 'admin',
                email: 'admin@lang.com'
            },
            'luis': {
                username: 'luis',
                password: 'luis123',
                fullName: 'Luis Nicolás',
                role: 'operator',
                email: 'luis@lang.com'
            },
            'operador': {
                username: 'operador',
                password: 'op123',
                fullName: 'Operador Bodega',
                role: 'operator',
                email: 'operador@lang.com'
            }
        };
        localStorage.setItem('bodega_users', JSON.stringify(users));
    }
}

// Función de autenticación local
function authenticateUser(username, password) {
    const users = JSON.parse(localStorage.getItem('bodega_users') || '{}');
    const user = users[username.toLowerCase()];
    
    if (user && user.password === password) {
        return {
            success: true,
            user: user,
            token: 'local_token_' + Date.now()
        };
    }
    
    return {
        success: false,
        error: 'Usuario o contraseña incorrectos'
    };
}

document.addEventListener("DOMContentLoaded", () => {
    // Inicializar usuarios en localStorage
    initializeUsers();
    
    const loginForm = document.getElementById('loginForm');
    const messageDiv = document.getElementById('message');

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const username = loginForm.username.value;
        const password = loginForm.password.value;

        // Simular delay de servidor
        messageDiv.classList.remove('hidden', 'success', 'error');
        messageDiv.textContent = 'Verificando credenciales...';
        messageDiv.classList.add('info');
        
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const result = authenticateUser(username, password);
        messageDiv.classList.remove('hidden', 'success', 'error', 'info');

        if (result.success) {
            messageDiv.classList.add('success');
            messageDiv.textContent = `¡Bienvenido ${result.user.fullName || result.user.username}! Redirigiendo...`;
            
            // Guardar token e información del usuario
            localStorage.setItem('token', result.token);
            localStorage.setItem('username', result.user.username);
            localStorage.setItem('userInfo', JSON.stringify(result.user));
            localStorage.setItem('loginTime', new Date().toISOString());

            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        } else {
            messageDiv.classList.add('error');
            messageDiv.textContent = result.error || 'Error de autenticación';
        }
    });
});

