const router = require('express').Router();
const User = require('../models/User');

const jwt = require('jsonwebtoken');

const Joi = require('@hapi/joi');

const bcrypt = require('bcrypt');

const expiresIn = 60000;
//const user = require('../models/User');
require('dotenv').config();

const schemaRegister = Joi.object({
    name: Joi.string().min(6).max(255).required(),
    email: Joi.string().min(6).max(255).required().email(),
    password: Joi.string().min(6).max(1024).required()
})

const schemaLogin = Joi.object({
    email: Joi.string().min(6).max(255).required().email(),
    password: Joi.string().min(6).max(1024).required()
})

const schemaRecover = Joi.object({
    email: Joi.string().min(6).max(255).required().email()
})

const schemaPasswordNew = Joi.object({
    passwd: Joi.string().min(3).max(15).required(),
    repasswd: Joi.string().min(3).max(15).required(),
    token: Joi.string().min(3).max(1024).required(),
});

router.post('/newpassword', async(req,res) => {
    const {error} = schemaPasswordNew.validate(req.body);
    if(error) return res.status(400).json({error: error.details[0].message });
    
    if(req.body.passwd != req.body.repasswd) return res.status(400).json({error: "las contraseñas no coinciden" });
    // hash contraseña
    const salt = await bcrypt.genSalt(10);
    const password = await bcrypt.hash(req.body.passwd, salt);
    const token = req.body.token
    const composite = { password, token}

    const user = decodeJWT(token);
    console.log(user)

    res.json({
        error: null,
        data: user.id
    });

})

router.delete('/:id', async(req,res)=>{
    const id = req.params.id;
    if (!id) return res.status(400).json({error: "El Id no puede estar vacío" });
    try{
        const resultado = await User.findOneAndDelete({_id:id});
        if(!resultado) return res.status(400).json({error: "El Id ya no existe" });
        res.json({
            error:null,
            data: resultado
        })
    }catch(error){
        res.json({
            error:error
        })
    }
})

router.get('/', async(req,res)=>{
    try {
        const resultado = await User.find();
        if(!resultado) return res.status(400).json({error: "No existen datos" });
        //const numeroDeObjetos = resultado.length();
        res.json({
            error:null,
            data: resultado
        })
    } catch (error) {
        res.json({
            error:error
        })
    }
})

router.put('/services/:id', async(req,res)=>{
    const id = req.params.id;
    if (!id) return res.status(400).json({error: "El Id no puede estar vacío" });
    try {
        const UserToModify = await User.findOne({_id: id});
        //console.log(UserToModify);
        const UserToUpdate = UserToModify;
        UserToUpdate.services.push(req.body.service);
        //console.log(UserToUpdate);
        const updated = await User.findOneAndUpdate(
            {_id:id},
            UserToUpdate,
            {
                new: true,                       // return updated doc
                runValidators: true              // validate before update
            }
        )
          res.json({
            error: null,
            data: updated
        })       
    } catch (error) {
        
    }
})

router.delete('/services/:id', async(req,res)=>{
    const id = req.params.id;
    if (!id) return res.status(400).json({error: "El Id no puede estar vacío" });
    try {
        const UserToModify = await User.findOne({_id: id});
        //console.log(UserToModify);
        const UserToUpdate = UserToModify;
        let services = UserToUpdate.services
        if(!services) return res.status(400).json({error: "El Id no contiene Servicios" });
        const newServices = services.filter(servicio => servicio !== req.body.service);
        console.log(services,newServices);
        const isEqualArrays = newServices===services? true : false; 
        console.log(isEqualArrays);
        if(isEqualArrays) return res.status(400).json({error: "El Id no contiene \"" +  req.body.service + "\""});
        else{
            UserToUpdate.services = newServices;
            //console.log(UserToUpdate);
            const updated = await User.findOneAndUpdate(
                {_id:id},
                UserToUpdate,
                {
                    new: true,                       // return updated doc
                    runValidators: true              // validate before update
                }
            )
              res.json({
                error: null,
                data: updated
            })
        }
       
    } catch (error) {
        res.json({
            error: error
        })
    }
})

router.put('/newpassword/:id', async (req, res) => {

    const id = req.params.id;
    const body = req.body;
    if (!id) return res.status(400).json({error: "El Id no puede estar vacío" });

    //console.log(id)
    //console.log('body', body)

    const salt = await bcrypt.genSalt(10);
    const password = await bcrypt.hash(req.body.passwd, salt);
    //console.log(password);

    try {
        const UserToModify = await User.findOne({_id: id});
        //console.log(UserToModify);
        const UserToUpdate = UserToModify;
        UserToUpdate.password = password
        //console.log(UserToUpdate);
        const updated = await User.findOneAndUpdate(
            {_id:id},
            UserToUpdate,
            {
                new: true,                       // return updated doc
                runValidators: true              // validate before update
            }
        )
          res.json({
            error: null,
            data: updated
        })
    } catch (error) {
        console.log(error)
        res.json({
            estado: false,
            mensaje: 'Contraseña No pudo ser Actualizada'
        })
    }
})

function decodeJWT(token) {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
}

router.post('/recover', async(req, res) =>{
    const {error} = schemaRecover.validate(req.body);
    if(error) return res.status(400).json({error: error.details[0].message });

    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(400).json({ error: 'Usuario no encontrado' });

    // create token
    const token = jwt.sign({
        name: user.name,
        id: user._id
    }, process.env.TOKEN_SECRET);

    //Envio de email de recuperación
    const nodemailer = require("nodemailer");
    console.log(process.env.NORRESPONDER_SENDER,process.env.NORRESPONDER_PASSWORD);

    const transporter = nodemailer.createTransport({
        host: "mail.aysafi.com",
        port: 465,
        secure: true,
        auth: {
            // TODO: replace `user` and `pass` values from <https://forwardemail.net>
            user: 'noresponder@aysafi.com',
            pass: 'CylhVVdV]d^Q'
        }
    });
    var urirec = "http://localhost:8080/newpassword/?auth-token=" + token;
    let mailOptions = {
    from: "noresponder@aysafi.com",
    to: req.body.email,
    subject: 'Correo de Recuperación de Contraseña',
           // plaintext body
           text: 'Siga cuidadosamente las siguientes indicaciones!',

           // HTML body
           html: `<p><b>Hola/b>, Por favor pincha en el siguiente <a href="`+ urirec +`"><strong>LINK</strong></a> para restablecer Contraseña <button onClick="sendUrl();"></button>`,
           // AMP4EMAIL
           amp: `<!doctype html>
           <html ⚡4email>
             <head>
               <meta charset="utf-8">
               <style amp4email-boilerplate>body{visibility:hidden}</style>
               <script async src="https://cdn.ampproject.org/v0.js"></script>
               <script async custom-element="amp-anim" src="https://cdn.ampproject.org/v0/amp-anim-0.1.js"></script>
             </head>
             <body>
               <p><b>Hola/b>, Por favor pincha en el siguiente <a href="`+ urirec +`"><strong>LINK</strong></a> para restablecer Contraseña <button onClick="sendUrl();"></button>
               <amp-img src="https://cldup.com/P0b1bUmEet.png" width="16" height="16"/></p>
               <p>No embedded image attachments in AMP, so here's a linked nyan cat instead:<br/>
                 <amp-anim src="https://cldup.com/D72zpdwI-i.gif" width="500" height="350"/></p>
             </body>
             <script>
                function sendUrl(){
                    var myHeaders = new Headers();
                    myHeaders.append("auth-token", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiQXNkcnViYWwgRnVlbnRlcyIsImlkIjoiNjU1M2JkMmQ5NzhhZDEyMTc0MDFiOGE2IiwiaWF0IjoxNjk5OTkyNTgwfQ.yEZ3bxTh7ZSK-1bww5EkurBrDwptyXWprjfQh8iegOs");

                    var requestOptions = {
                    method: 'GET',
                    headers: myHeaders,
                    redirect: 'follow'
                    };

                    fetch("http://localhost:8080/api/newpassword", requestOptions)
                    .then(response => response.text())
                    .then(result => console.log(result))
                    .catch(error => console.log('error', error));
                }
             </script>
           </html>`,
            // An array of attachments
    attachments: [
                // String attachment
    {
        filename: 'notes.txt',
        content: 'Some notes about this e-mail',
        contentType: 'text/plain' // optional, would be detected from the filename
    },
    // Binary Buffer attachment
    {                
        filename: 'image.png',
        content: Buffer.from(
                        'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQAQMAAAAlPW0iAAAABlBMVEUAAAD/' +
                            '//+l2Z/dAAAAM0lEQVR4nGP4/5/h/1+G/58ZDrAz3D/McH8yw83NDDeNGe4U' +
                            'g9C9zwz3gVLMDA/A6P9/AFGGFyjOXZtQAAAAAElFTkSuQmCC',
                        'base64'
    ),
        cid: 'note@aysafi.com' // should be as unique as possible
    },
    
                // File Stream attachment
    {
        filename: 'nyan cat ✔.gif',
        path: __dirname + '/assets/nyan.gif',
        cid: 'nyan@example.com' // should be as unique as possible
    }
    ],
    list: {
                
        // List-Help: <mailto:admin@example.com?subject=help>
        help: 'admin@example.com?subject=help',
    
        // List-Unsubscribe: <http://example.com> (Comment)
        unsubscribe: [
                    {
                        url: 'http://example.com/unsubscribe',
                        comment: 'A short note about this url'
                    },
                    'unsubscribe@example.com'
        ],
    
                // List-ID: "comment" <example.com>
    id: {
        url: 'mylist.aysafi.com',
        comment: 'This is my awesome list'
        }
    }
}
    transporter.sendMail(mailOptions, function(err, data) {
    if (err) {
        console.log("Error " + err);
    } else {
        console.log("Email sent successfully");
    }
    });

    res.json({
        error: null,
        data: 'Revise Su Correo electrónico con Instrucciones de Como recuperar la Contraseña'
    })
})

router.post('/login', async (req, res) => {
    // validaciones
    const { error } = schemaLogin.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message })
    
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(403).json({ error: 'Usuario o Contraseña No válidos' });

    const validPassword = await bcrypt.compare(req.body.password, user.password);
    if (!validPassword) return res.status(403).json({ error: 'Usuario o Contraseña No válidos' })

    // create token
    const token = jwt.sign({
        name: user.name,
        id: user._id
    }, process.env.TOKEN_SECRET);
    
    res.header('auth-token', token).json({
        error: null,
        data: {token}
    })
    
    /*res.json({
        error: null,
        data: 'exito bienvenido'
    })*/
});

router.get('/pwdchange', async(req, res)=>{
    res.render('pwdchange',{'title': 'Solicitar Cambio Contraseña'});
});

router.get('/login', async(req,res)=>{
    res.render('login',{'title': 'Login'});
});

router.get('/register', async(req,res)=>{
    res.render('register',{'title': 'Registro'});
})

router.post('/register', async (req, res) => {

    // validate user
    const { error } = schemaRegister.validate(req.body)
    
    if (error) {
        return res.status(400).json(
            {error: error.details[0].message}
        )
    }

    const isEmailExist = await User.findOne({ email: req.body.email });
    if (isEmailExist) {
        return res.status(401).json(
            {error: 'Email ya registrado'}
        )
    }

    // hash contraseña
    const salt = await bcrypt.genSalt(10);
    const password = await bcrypt.hash(req.body.password, salt);

    const user = new User({
        name: req.body.name,
        email: req.body.email,
        password: password
    });
    try {
        const savedUser = await user.save();
        res.json({
            error: null,
            data: savedUser
        })
    } catch (error) {
        res.status(400).json({error})
    }
})

module.exports = router;