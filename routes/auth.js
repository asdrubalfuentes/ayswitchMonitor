const router = require('express').Router();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Joi = require('@hapi/joi');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const { rateLimit } = require('express-rate-limit');

require('dotenv').config();

const User = require('../models/user');
const { requireAdmin, requireAdminPage } = require('./validate-token');

const SESSION_DAYS = 30;
const RESET_TTL_MS = 30 * 60 * 1000;
// Nunca se devuelve el hash de la contraseña ni los datos de recuperación.
const SAFE_FIELDS = '-password -resetTokenHash -resetTokenExpires';
// Para que login tarde parecido exista o no el correo.
const DUMMY_HASH = bcrypt.hashSync('sin-usuario', 10);

const schemaRegister = Joi.object({
    name: Joi.string().min(6).max(255).required(),
    email: Joi.string().min(6).max(255).required().email(),
    password: Joi.string().min(8).max(72).required()
})

const schemaLogin = Joi.object({
    email: Joi.string().min(6).max(255).required().email(),
    password: Joi.string().min(6).max(1024).required()
})

const schemaRecover = Joi.object({
    email: Joi.string().min(6).max(255).required().email()
})

const schemaService = Joi.object({
    service: Joi.string().min(1).max(50).required()
})

function limiter(windowMs, limit, options = {}) {
    return rateLimit({
        windowMs,
        limit,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        message: { error: 'Demasiados intentos. Intente de nuevo más tarde.' },
        ...options
    });
}
const loginLimiter = limiter(15 * 60 * 1000, 10, { skipSuccessfulRequests: true });
const recoverLimiter = limiter(60 * 60 * 1000, 5);
const resetLimiter = limiter(60 * 60 * 1000, 10);

const sha256 = (text) => crypto.createHash('sha256').update(text).digest('hex');

let transporter;
function sendRecoveryMail(to, link) {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: 'mail.aysafi.com',
            port: 465,
            secure: true,
            auth: {
                user: process.env.NORESPONDER_SENDER || 'noresponder@aysafi.com',
                pass: process.env.NORESPONDER_PASSWORD
            }
        });
    }
    return transporter.sendMail({
        from: 'noresponder@aysafi.com',
        to,
        subject: 'Recuperación de contraseña',
        text: 'Recibimos una solicitud para restablecer su contraseña.\n\n' +
            'Abra este enlace (válido por 30 minutos y de un solo uso):\n' + link + '\n\n' +
            'Si usted no lo solicitó, ignore este correo: su contraseña no cambiará.',
        html: '<p>Recibimos una solicitud para restablecer su contraseña.</p>' +
            '<p><a href="' + link + '"><strong>Restablecer contraseña</strong></a></p>' +
            '<p>El enlace es válido por 30 minutos y de un solo uso. Si usted no lo solicitó, ' +
            'ignore este correo: su contraseña no cambiará.</p>'
    });
}

// ---- Administración de usuarios: solo cuentas listadas en ADMIN_EMAILS ----

router.get('/', requireAdmin, async (req, res) => {
    try {
        const data = await User.find().select(SAFE_FIELDS);
        res.json({ error: null, data });
    } catch (error) {
        res.status(500).json({ error: 'No se pudo leer la lista de usuarios.' });
    }
})

router.put('/services/:id', requireAdmin, async (req, res) => {
    const { error } = schemaService.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Id inválido' });
    try {
        const updated = await User.findByIdAndUpdate(
            req.params.id,
            { $addToSet: { services: req.body.service } },
            { new: true }
        ).select(SAFE_FIELDS);
        if (!updated) return res.status(404).json({ error: 'El Id no existe' });
        res.json({ error: null, data: updated });
    } catch (error) {
        res.status(500).json({ error: 'No se pudo actualizar el usuario.' });
    }
})

router.delete('/services/:id', requireAdmin, async (req, res) => {
    const { error } = schemaService.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Id inválido' });
    try {
        const updated = await User.findOneAndUpdate(
            { _id: req.params.id, services: req.body.service },
            { $pull: { services: req.body.service } },
            { new: true }
        ).select(SAFE_FIELDS);
        if (!updated) return res.status(400).json({ error: 'El usuario no existe o no contiene "' + req.body.service + '"' });
        res.json({ error: null, data: updated });
    } catch (error) {
        res.status(500).json({ error: 'No se pudo actualizar el usuario.' });
    }
})

router.delete('/:id', requireAdmin, async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Id inválido' });
    if (req.params.id === req.user.id) return res.status(400).json({ error: 'No puede eliminar su propia cuenta.' });
    try {
        const deleted = await User.findByIdAndDelete(req.params.id).select(SAFE_FIELDS);
        if (!deleted) return res.status(400).json({ error: 'El Id ya no existe' });
        res.json({ error: null, data: deleted });
    } catch (error) {
        res.status(500).json({ error: 'No se pudo eliminar el usuario.' });
    }
})

router.get('/register', requireAdminPage, (req, res) => {
    res.render('register', { 'title': 'Registro' });
})

router.post('/register', requireAdmin, async (req, res) => {
    const { error } = schemaRegister.validate(req.body)
    if (error) return res.status(400).json({ error: error.details[0].message })

    const isEmailExist = await User.findOne({ email: req.body.email });
    if (isEmailExist) return res.status(409).json({ error: 'Email ya registrado' })

    const salt = await bcrypt.genSalt(10);
    const password = await bcrypt.hash(req.body.password, salt);

    try {
        const saved = await new User({ name: req.body.name, email: req.body.email, password }).save();
        res.json({ error: null, data: { id: saved._id, name: saved.name, email: saved.email } })
    } catch (error) {
        res.status(400).json({ error: 'No se pudo registrar el usuario.' })
    }
})

// ---- Sesión ----

router.post('/login', loginLimiter, async (req, res) => {
    const { error } = schemaLogin.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message })

    const user = await User.findOne({ email: req.body.email });
    const validPassword = await bcrypt.compare(req.body.password, user ? user.password : DUMMY_HASH);
    if (!user || !validPassword) return res.status(403).json({ error: 'Usuario o Contraseña No válidos' });

    const token = jwt.sign({
        name: user.name,
        id: user._id
    }, process.env.TOKEN_SECRET, { expiresIn: SESSION_DAYS + 'd' });

    res.cookie('auth_token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000
    });
    res.json({ error: null, data: 'ok' })
});

router.get('/logout', (req, res) => {
    res.clearCookie('auth_token', { httpOnly: true, secure: true, sameSite: 'lax' });
    res.redirect('/api/user/login');
});

// ---- Recuperación de contraseña ----
// 1) /recover genera un token aleatorio de un solo uso (guarda solo su hash,
//    vence a los 30 min) y lo envía por correo. Responde siempre lo mismo,
//    exista o no el correo, para no revelar quién tiene cuenta.
// 2) El enlace del correo lleva el token en el fragmento (#token=...), que el
//    navegador nunca envía al servidor: no queda en logs ni en proxies.
// 3) /newpassword canjea el token (atómico, una sola vez), cambia la
//    contraseña e invalida las sesiones abiertas.

router.post('/recover', recoverLimiter, async (req, res) => {
    const { error } = schemaRecover.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    try {
        const user = await User.findOne({ email: req.body.email });
        if (user) {
            const token = crypto.randomBytes(32).toString('hex');
            await User.updateOne({ _id: user._id }, {
                resetTokenHash: sha256(token),
                resetTokenExpires: Date.now() + RESET_TTL_MS
            });
            const link = (process.env.PUBLIC_URL || 'https://smartswitch.aysafi.com') + '/api/user/newpassword#token=' + token;
            sendRecoveryMail(user.email, link).catch((err) => console.log('Error enviando correo de recuperación:', err.message));
        }
    } catch (err) {
        console.log('Error en recover:', err.message);
    }

    res.json({
        error: null,
        data: 'Si el correo está registrado, recibirá las instrucciones para restablecer la contraseña.'
    })
})

router.post('/newpassword', resetLimiter, async (req, res) => {
    const { token, passwd, repasswd } = req.body || {};
    const INVALID_LINK = 'El enlace no es válido o ya expiró. Solicite uno nuevo.';

    if (typeof passwd !== 'string' || passwd.length < 8 || Buffer.byteLength(passwd) > 72) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
    }
    if (passwd !== repasswd) return res.status(400).json({ error: 'Las contraseñas no coinciden.' });
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return res.status(400).json({ error: INVALID_LINK });

    try {
        const password = await bcrypt.hash(passwd, 10);
        const user = await User.findOneAndUpdate(
            { resetTokenHash: sha256(token), resetTokenExpires: { $gt: Date.now() } },
            { password, passwordChangedAt: Date.now(), $unset: { resetTokenHash: 1, resetTokenExpires: 1 } }
        );
        if (!user) return res.status(400).json({ error: INVALID_LINK });
        res.json({ error: null, data: 'Contraseña actualizada. Ya puede iniciar sesión.' });
    } catch (error) {
        res.status(500).json({ error: 'No se pudo actualizar la contraseña.' });
    }
})

// ---- Páginas públicas ----

router.get('/pwdchange', (req, res) => {
    res.render('pwdchange', { 'title': 'Solicitar Cambio Contraseña' });
});

router.get('/newpassword', (req, res) => {
    res.render('newPassword', { 'title': 'Establecer Contraseña' });
});

router.get('/login', (req, res) => {
    res.render('login', { 'title': 'Login' });
});

module.exports = router;
