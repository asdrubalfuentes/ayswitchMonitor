const router = require('express').Router();

// Paneles disponibles. Quién ve cuál sale de la base de datos: el campo
// `services` del usuario lleva "panel:<clave>" (se administra con
// PUT/DELETE /api/user/services/:id). Un administrador ve todos.
const PANELS = {
    inicio: { label: 'Inicio', path: '/api/dashboard/inicio/' },
    roberto: { label: 'Roberto', path: '/api/dashboard/roberto/' }
};

function panelsOf(user) {
    return Object.entries(PANELS)
        .filter(([key]) => user.isAdmin || (user.services || []).includes('panel:' + key))
        .map(([key, panel]) => ({ key, ...panel }));
}

const requirePanel = (key) => (req, res, next) => {
    if (panelsOf(req.user).some((p) => p.key === key)) return next();
    res.status(403).send('No tiene acceso a este panel.');
};

router.get('/', (req, res) => {
    const panels = panelsOf(req.user);
    if (!panels.length) return res.status(403).send('Su cuenta aun no tiene un panel asignado. Contacte al administrador.');
    res.redirect(panels[0].path);
})

router.get('/users', async(req,res)=>{
    res.render('userlist',{title:"Lista de Usuarios"});
})

router.get('/inicio/?', requirePanel('inicio'), async(req,res)=>{
    res.render('inicio',{title:"Control de Portones", user:req.user, panels:panelsOf(req.user), current:'inicio'});
})

router.get('/roberto/?', requirePanel('roberto'), async(req,res)=>{
    res.render('roberto',{title:"Control de Portones", user:req.user, panels:panelsOf(req.user), current:'roberto'});
})

module.exports = router
