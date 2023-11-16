const router = require('express').Router();

router.get('/', (req, res) => {
    /*res.json({
        error: null,
        data: {
            title: 'mi ruta protegida',
            user: req.user
        }
    })*/
    if(req.user.id==='6553bd2d978ad1217401b8a6'){
        res.redirect('http://emqx.aysafi.com:3001');
        console.log('reenviado a su dashboard personal', 'http://emqx.aysafi.com:3001');
    }else if(req.user.id==='65561fd11a016a22a2989bea'){
        res.redirect('http://emqx.aysafi.com:3000');
        console.log('reenviado a su dashboard personal', 'http://emqx.aysafi.com:3000');
    }
})

module.exports = router