const express = require("express");
const cors = require("cors");
const morgan = require('morgan');
const bodyparser = require('body-parser');
const app = express();
const mongoose = require('mongoose');
app.use(morgan('dev'));
require('dotenv').config();

var corsOptions = {
  origin: "*"
};

app.use(cors(corsOptions));

app.use(bodyparser.urlencoded({ extended: false }));
app.use(bodyparser.json());

// Motor de plantilla
app.set("view engine", "ejs");
app.set("views", __dirname + "/views");

// parse requests of content-type - application/json
app.use(express.json());

// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));



// Conexión a Base de datos
const uri = `mongodb://localhost:27017/dbAysafi`;
mongoose.connect(uri)
.then(() => console.log('Base de datos conectada'))
.catch(e => console.log('error db:', e))

// import routes
const authRoutes = require('./routes/auth');
const dashboadRoutes = require('./routes/dashboard');
const verifyToken = require('./routes/validate-token');

// route middlewares
app.use('/api/user', authRoutes);
app.use('/api/dashboard', verifyToken, dashboadRoutes);


// simple route
app.get('/newpassword', (req, res) => {

  res.render('newPassword', {titulo:'Establecer Nueva Contraseña'} );

});


// set port, listen for requests
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});
