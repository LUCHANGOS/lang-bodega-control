document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById('loginForm');
    const messageDiv = document.getElementById('message');

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const username = loginForm.username.value;
        const password = loginForm.password.value;

        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const result = await response.json();
        messageDiv.classList.remove('hidden', 'success', 'error');

        if (result.success) {
            messageDiv.classList.add('success');
            messageDiv.textContent = `¡Bienvenido ${result.user.fullName || result.user.username}! Redirigiendo...`;
            
            // Guardar token e información del usuario
            localStorage.setItem('token', result.token);
            localStorage.setItem('username', result.user.username);
            localStorage.setItem('userInfo', JSON.stringify(result.user));

            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1000);
        } else {
            messageDiv.classList.add('error');
            messageDiv.textContent = result.error || 'Error de autenticación';
        }
    });
});

