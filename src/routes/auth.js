const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { db } = require('../models/database');
const router = express.Router();

// Login endpoint
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validar campos requeridos
        if (!username || !password) {
            return res.status(400).json({ 
                error: 'Usuario y contraseña son requeridos' 
            });
        }

        // Buscar usuario en la base de datos
        db.get(
            'SELECT * FROM users WHERE username = ?',
            [username.toLowerCase()],
            async (err, user) => {
                if (err) {
                    console.error('Error buscando usuario:', err);
                    return res.status(500).json({ 
                        error: 'Error interno del servidor' 
                    });
                }

                if (!user) {
                    return res.status(401).json({ 
                        error: 'Credenciales inválidas' 
                    });
                }

                // Verificar contraseña
                try {
                    const passwordMatch = await bcrypt.compare(password, user.password);
                    
                    if (!passwordMatch) {
                        return res.status(401).json({ 
                            error: 'Credenciales inválidas' 
                        });
                    }

                    // Actualizar último login
                    db.run(
                        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
                        [user.id]
                    );

                    // Generar JWT token
                    const token = jwt.sign(
                        { 
                            userId: user.id,
                            username: user.username,
                            fullName: user.full_name,
                            role: user.role,
                            loginTime: new Date()
                        },
                        process.env.JWT_SECRET,
                        { expiresIn: '8h' }
                    );

                    res.json({
                        success: true,
                        message: 'Login exitoso',
                        token: token,
                        user: {
                            id: user.id,
                            username: user.username,
                            fullName: user.full_name,
                            role: user.role
                        }
                    });

                } catch (bcryptError) {
                    console.error('Error verificando contraseña:', bcryptError);
                    return res.status(500).json({ 
                        error: 'Error interno del servidor' 
                    });
                }
            }
        );

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor' 
        });
    }
});

// Verificar token
router.get('/verify', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token no proporcionado' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token inválido' });
        }
        res.json({ valid: true, user: user });
    });
});

// Logout (invalidar token del lado del cliente)
router.post('/logout', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Sesión cerrada correctamente' 
    });
});

module.exports = router;
