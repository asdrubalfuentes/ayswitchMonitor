const express = require("express");
const cors = require("cors");
const morgan = require('morgan');
const bodyparser = require('body-parser');
const app = express();
const mongoose = require('mongoose');
const path = require('path');
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
const uri = process.env.MONGODB_URI;
mongoose.connect(uri,{dbName:"dbAysafi"})
.then(() => console.log('Base de datos conectada'))
.catch(e => console.log('error db:', e))


// import routes
const authRoutes = require('./routes/auth');
const dashboadRoutes = require('./routes/dashboard');
const verifyToken = require('./routes/validate-token');

app.use('/static/', express.static(path.join(__dirname + '/public')));

// route middlewares
app.use('/api/user', authRoutes);
app.use('/api/dashboard', verifyToken, dashboadRoutes);


// simple route
app.get('/', (req, res) => {

  res.redirect('/api/user/login');

});


// set port, listen for requests
const fs = require('fs');
const https = require('https');
const http = require('http');

const PORT = Number(process.env.HTTPS_PORT || process.env.PORT || 8080);
// BIND_HOST lets this bind a single specific address (e.g. the VPS's own
// public IPv6) instead of the default wildcard — needed here because port
// 443 on the wildcard/IPv4 address is already Cotizador's, and binding the
// wildcard IPv6 "::" would dual-stack-claim IPv4 too and collide with it.
const BIND_HOST = process.env.BIND_HOST || undefined;
const hasCerts = process.env.TLS_CERT_FILE && fs.existsSync(process.env.TLS_CERT_FILE);

const server = hasCerts
  ? https.createServer({
      cert: fs.readFileSync(process.env.TLS_CERT_FILE),
      key: fs.readFileSync(process.env.TLS_KEY_FILE),
      ca: process.env.TLS_CA_FILE ? fs.readFileSync(process.env.TLS_CA_FILE) : undefined
    }, app)
  : http.createServer(app);

server.listen(PORT, BIND_HOST, () => {
  console.log(`Server is running on port ${PORT}${BIND_HOST ? ' (' + BIND_HOST + ')' : ''} (${hasCerts ? 'HTTPS' : 'HTTP - sin certificado, solo desarrollo'}).`);
});
