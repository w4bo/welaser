var express = require('express')
var app = express()
const expressip = require('express-ip');
app.use(expressip().getIpInfoMiddleware);
var http = require('http').createServer(app)
var bodyParser = require('body-parser')
var mongoose = require('mongoose')
var cors = require('cors')
var path = require('path')
var env = require('dotenv')
var io = require('socket.io')(http);
const fs = require("fs")

env.config()

io.on('connection', (socket) => {
  console.log('a user connected')
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

global.io = io

global.appRoot = path.resolve(__dirname);

app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb'}))
app.use(bodyParser.urlencoded( {extended: false }))
app.use(bodyParser.json())

app.use(cors())

app.use('/static', express.static(__dirname + '/public'));

// Connect to MongoDB
mongoose
  .connect(
    process.env.MONGO_LOCAL,
    { useNewUrlParser: true }
  )
  .then(() => console.log('MongoDB Connected (LOCAL)'))
  .catch(err => console.log(err));

var routes = require('./src/routes/routes')
routes(app)

//Middleware
app.use(express.json())

// http
http.listen(process.env.SERVER_PORT, process.env.SERVER_ADDRESS, function() {
  console.log('Node Server listening on port '+process.env.SERVER_PORT)
})
