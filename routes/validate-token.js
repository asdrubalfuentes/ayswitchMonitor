const jwt = require('jsonwebtoken')
const User = require('../models/user')

function readCookie(req, name) {
    for (const part of (req.headers.cookie || '').split(';')) {
        const idx = part.indexOf('=');
        if (idx !== -1 && part.slice(0, idx).trim() === name) {
            try { return decodeURIComponent(part.slice(idx + 1).trim()); } catch (e) { return null; }
        }
    }
    return null;
}

function adminEmails() {
    return String(process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
}

// Devuelve el usuario de la sesión o null. El token viaja en una cookie
// HttpOnly, nunca en la URL, y además se comprueba contra la base: un usuario
// borrado o con la contraseña cambiada después de emitido el token queda fuera.
async function authenticate(req) {
    try {
        const token = readCookie(req, 'auth_token');
        if (!token) return null;
        const payload = jwt.verify(token, process.env.TOKEN_SECRET, { algorithms: ['HS256'] });
        // Los tokens anteriores a este esquema no traen vencimiento (no
        // expiraban nunca y algunos quedaron en logs): se rechazan.
        if (!payload.exp || !payload.id) return null;
        const user = await User.findById(payload.id).select('name email services passwordChangedAt').lean();
        if (!user) return null;
        if (user.passwordChangedAt && payload.iat < Math.floor(user.passwordChangedAt / 1000)) return null;
        return {
            id: String(user._id),
            name: user.name,
            email: user.email,
            services: user.services,
            isAdmin: adminEmails().includes(String(user.email).toLowerCase())
        };
    } catch (error) {
        return null;
    }
}

// middleware para páginas protegidas: sin sesión válida, al login
const verifyToken = async (req, res, next) => {
    const user = await authenticate(req);
    if (!user) return res.redirect('/api/user/login');
    req.user = user;
    next();
}

// middleware para endpoints de administración (responde JSON)
const requireAdmin = async (req, res, next) => {
    const user = await authenticate(req);
    if (!user) return res.status(401).json({ error: 'Debe iniciar sesión.' });
    if (!user.isAdmin) return res.status(403).json({ error: 'Esta acción requiere una cuenta de administrador.' });
    req.user = user;
    next();
}

// igual que requireAdmin, para páginas: redirige al login
const requireAdminPage = async (req, res, next) => {
    const user = await authenticate(req);
    if (!user || !user.isAdmin) return res.redirect('/api/user/login');
    req.user = user;
    next();
}

module.exports = verifyToken;
module.exports.requireAdmin = requireAdmin;
module.exports.requireAdminPage = requireAdminPage;
