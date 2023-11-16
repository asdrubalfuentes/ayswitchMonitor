const jwt = require('jsonwebtoken')

// middleware to validate token (rutas protegidas)
const verifyToken = (req, res, next) => {
    const token = req.query.auth_token;
    console.log(token)
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
