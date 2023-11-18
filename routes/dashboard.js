const router = require('express').Router();

router.get('/', (req, res) => {
    /*res.json({
        error: null,
        data: {
            title: 'mi ruta protegida',
            user: req.user
        }
    })*/
    if(req.user.id==='655754169607e1f015508545'){
        res.redirect('http://emqx.aysafi.com:3001');
        console.log('reenviado a su dashboard personal', 'http://emqx.aysafi.com:3001');
    }else if(req.user.id==='6557548c9607e1f015508548' || req.user.id==='655754ec9607e1f01550854b'){
        res.redirect('http://emqx.aysafi.com:3000');
        console.log('reenviado a su dashboard personal', 'http://emqx.aysafi.com:3000');
    }
})

router.get('/users', async(req,res)=>{
    res.render('userlist',{title:"Lista de Usuarios"});
})

module.exports = router
