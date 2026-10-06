const jwt = require('jsonwebtoken')

function readCookie(req, name) {
    for (const part of (req.headers.cookie || '').split(';')) {
        const idx = part.indexOf('=');
        if (idx !== -1 && part.slice(0, idx).trim() === name) {
            try { return decodeURIComponent(part.slice(idx + 1).trim()); } catch (e) { return null; }
        }
    }
    return null;
}

// middleware to validate token (rutas protegidas). El token viaja en una
// cookie HttpOnly, nunca en la URL, para que no quede en logs ni en el historial.
const verifyToken = (req, res, next) => {
    const token = readCookie(req, 'auth_token');
    if (!token) {
        return res.status(401).redirect('/api/user/login');
    }
    try {
        const verified = jwt.verify(token, process.env.TOKEN_SECRET)
        req.user = verified
        next() // continuamos
    } catch (error) {
        res.status(400).redirect('/api/user/login');
    }
}

module.exports = verifyToken;
