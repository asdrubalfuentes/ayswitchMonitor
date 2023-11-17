const router = require('express').Router();

router.get('/', (req, res) => {
    /*res.json({
        error: null,
        data: {
            title: 'mi ruta protegida',
            user: req.user
        }
    })*/
<<<<<<< HEAD
    if(req.user.id==='6553bd2d978ad1217401b8a6'){
        res.redirect('http://emqx.aysafi.com:3001');
        console.log('reenviado a su dashboard personal', 'http://emqx.aysafi.com:3001');
    }else if(req.user.id==='65561fd11a016a22a2989bea'){
=======
    if(req.user.id==='655754169607e1f015508545'){
        res.redirect('http://emqx.aysafi.com:3001');
        console.log('reenviado a su dashboard personal', 'http://emqx.aysafi.com:3001');
    }else if(req.user.id==='6557548c9607e1f015508548' || req.user.id==='655754ec9607e1f01550854b'){
>>>>>>> 4f395db (para produccion)
        res.redirect('http://emqx.aysafi.com:3000');
        console.log('reenviado a su dashboard personal', 'http://emqx.aysafi.com:3000');
    }
})

<<<<<<< HEAD
module.exports = router
=======
module.exports = router
>>>>>>> 4f395db (para produccion)
