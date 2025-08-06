// Sistema de Login para L.A.N.G. ERP
class LoginManager {
    constructor() {
        this.users = {
            'admin': {
                id: 'admin',
                usuario: 'admin',
                password: 'admin123',
                nombre: 'Administrador del Sistema',
                rol: 'Administrador',
                email: 'admin@lang.com',
                permisos: ['admin', 'bodeguero', 'supervisor', 'consulta'],
                avatar: 'fa-user-shield'
            },
            'bodeguero': {
                id: 'bodeguero',
                usuario: 'bodeguero',
                password: 'bod123',
                nombre: 'Bodeguero Principal',
                rol: 'Bodeguero',
                email: 'bodeguero@lang.com',
                permisos: ['bodeguero', 'consulta'],
                avatar: 'fa-user-hard-hat'
            },
            'supervisor': {
                id: 'supervisor',
                usuario: 'supervisor',
                password: 'sup123',
                nombre: 'Supervisor de Planta',
                rol: 'Supervisor',
                email: 'supervisor@lang.com',
                permisos: ['supervisor', 'consulta'],
                avatar: 'fa-user-tie'
            }
        };
        
        this.init();
    }

    init() {
        // Verificar si ya hay una sesión activa
        this.checkExistingSession();
        
        // Configurar eventos
        this.setupEventListeners();
        
        // Auto-completar último usuario recordado
        this.loadRememberedUser();
    }

    checkExistingSession() {
        const sessionData = localStorage.getItem('currentSession');
        if (sessionData) {
            try {
                const session = JSON.parse(sessionData);
                const sessionAge = new Date().getTime() - new Date(session.timestamp).getTime();
                const maxAge = 24 * 60 * 60 * 1000; // 24 horas

                // Si la sesión es válida y no ha expirado
                if (session.user && sessionAge < maxAge) {
                    console.log('🔐 Sesión existente encontrada, redirigiendo...');
                    this.redirectToDashboard();
                    return;
                }
            } catch (error) {
                console.log('❌ Sesión inválida encontrada, limpiando...');
                localStorage.removeItem('currentSession');
            }
        }
        
        console.log('👤 No hay sesión activa, mostrando login');
    }

    setupEventListeners() {
        const loginForm = document.getElementById('loginForm');
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        const rememberMeCheck = document.getElementById('rememberMe');
        
        // Envío del formulario
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Enter en campos de texto
        [usernameInput, passwordInput].forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleLogin();
                }
            });
        });

        // Auto-completar credenciales demo al hacer clic
        document.querySelectorAll('.credential').forEach(credential => {
            credential.addEventListener('click', () => {
                const [username, password] = credential.textContent.split(' / ');
                usernameInput.value = username;
                passwordInput.value = password;
                usernameInput.focus();
            });
        });

        // Limpiar errores al escribir
        [usernameInput, passwordInput].forEach(input => {
            input.addEventListener('input', () => {
                this.clearError();
            });
        });
    }

    loadRememberedUser() {
        const rememberedUser = localStorage.getItem('rememberedUser');
        if (rememberedUser) {
            document.getElementById('username').value = rememberedUser;
            document.getElementById('rememberMe').checked = true;
            document.getElementById('password').focus();
        }
    }

    async handleLogin() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('rememberMe').checked;
        
        // Validaciones básicas
        if (!username || !password) {
            this.showError('Por favor, complete todos los campos');
            return;
        }

        // Mostrar estado de carga
        this.setLoadingState(true);

        // Simular delay de autenticación
        await this.delay(1000);

        // Verificar credenciales
        const user = this.authenticateUser(username, password);
        
        if (user) {
            // Login exitoso
            this.createSession(user);
            
            // Recordar usuario si está marcado
            if (rememberMe) {
                localStorage.setItem('rememberedUser', username);
            } else {
                localStorage.removeItem('rememberedUser');
            }
            
            this.showSuccess('Inicio de sesión exitoso');
            
            // Redirigir después de un breve delay
            setTimeout(() => {
                this.redirectToDashboard();
            }, 1000);
            
        } else {
            // Login fallido
            this.setLoadingState(false);
            this.showError('Usuario o contraseña incorrectos');
            this.clearPassword();
        }
    }

    authenticateUser(username, password) {
        const user = this.users[username.toLowerCase()];
        
        if (user && user.password === password) {
            console.log('✅ Autenticación exitosa para:', user.nombre);
            return {
                ...user,
                lastLogin: new Date().toISOString()
            };
        }
        
        console.log('❌ Autenticación fallida para:', username);
        return null;
    }

    createSession(user) {
        const session = {
            user: user,
            timestamp: new Date().toISOString(),
            sessionId: 'session_' + Date.now(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 horas
        };
        
        localStorage.setItem('currentSession', JSON.stringify(session));
        console.log('🔐 Sesión creada para:', user.nombre);
    }

    redirectToDashboard() {
        window.location.href = 'index.html';
    }

    setLoadingState(loading) {
        const loginBtn = document.getElementById('loginBtn');
        const loginText = document.getElementById('loginText');
        const loginLoading = document.getElementById('loginLoading');
        
        loginBtn.disabled = loading;
        loginText.style.display = loading ? 'none' : 'inline';
        loginLoading.style.display = loading ? 'inline-block' : 'none';
    }

    showError(message) {
        const errorDiv = document.getElementById('errorMessage');
        const errorText = document.getElementById('errorText');
        
        errorText.textContent = message;
        errorDiv.style.display = 'block';
        
        // Auto-ocultar después de 5 segundos
        setTimeout(() => {
            this.clearError();
        }, 5000);
    }

    clearError() {
        const errorDiv = document.getElementById('errorMessage');
        errorDiv.style.display = 'none';
    }

    showSuccess(message) {
        // Cambiar temporalmente el botón para mostrar éxito
        const loginText = document.getElementById('loginText');
        const originalText = loginText.textContent;
        
        loginText.innerHTML = `<i class="fas fa-check"></i> ${message}`;
        
        // Restaurar después de un tiempo
        setTimeout(() => {
            loginText.textContent = originalText;
        }, 3000);
    }

    clearPassword() {
        document.getElementById('password').value = '';
        document.getElementById('password').focus();
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Método para logout (llamado desde el dashboard)
    static logout() {
        localStorage.removeItem('currentSession');
        window.location.href = 'login.html';
    }

    // Método para verificar permisos
    static hasPermission(permission) {
        const sessionData = localStorage.getItem('currentSession');
        if (!sessionData) return false;
        
        try {
            const session = JSON.parse(sessionData);
            return session.user && session.user.permisos && 
                   session.user.permisos.includes(permission);
        } catch {
            return false;
        }
    }

    // Método para obtener usuario actual
    static getCurrentUser() {
        const sessionData = localStorage.getItem('currentSession');
        if (!sessionData) return null;
        
        try {
            const session = JSON.parse(sessionData);
            const sessionAge = new Date().getTime() - new Date(session.timestamp).getTime();
            const maxAge = 24 * 60 * 60 * 1000; // 24 horas

            if (session.user && sessionAge < maxAge) {
                return session.user;
            }
        } catch {
            localStorage.removeItem('currentSession');
        }
        
        return null;
    }
}

// Inicializar el sistema de login cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Inicializando sistema de login L.A.N.G. ERP');
    window.loginManager = new LoginManager();
});

// Exportar para uso global
window.LoginManager = LoginManager;
