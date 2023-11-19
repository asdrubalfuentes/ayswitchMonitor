const router = require('express').Router();

router.get('/', (req, res) => {
    /*res.json({
        error: null,
        data: {
            title: 'mi ruta protegida',
            user: req.user
        }
    })*/
    if(req.user.id==='655754169607e1f015508545' || req.user.id==='655a94e7417e28fafd215c19'){
        //console.log(req.query);
        res.redirect('/api/dashboard/inicio/?auth_token=' + req.query.auth_token);
        //console.log('reenviado a su dashboard personal', '/api/dashboard/inicio'); //'http://emqx.aysafi.com:3001'
    }else if(req.user.id==='6557548c9607e1f015508548' || req.user.id==='655754ec9607e1f01550854b'){
        res.redirect('/api/dashboard/roberto/?auth_token=' + req.query.auth_token);
        //console.log('reenviado a su dashboard personal', 'http://emqx.aysafi.com:3000');
    }
})

router.get('/users', async(req,res)=>{
    res.render('userlist',{title:"Lista de Usuarios"});
})

router.get('/inicio/?', async(req,res)=>{
    //console.log(req.query, "Estamos en Inicio");
    res.render('inicio',{title:"Control de Portones", token:req.query.auth_token, user:req.user});
})

router.get('/roberto/?', async(req,res)=>{
    //console.log(req.query, "Estamos en Inicio");
    res.render('roberto',{title:"Control de Portones", token:req.query.auth_token, user:req.user});
})

module.exports = router
