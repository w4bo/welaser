var express = require('express')
var app = express()
const expressip = require('express-ip');
app.use(expressip().getIpInfoMiddleware);
var http = require('http').createServer(app)
var bodyParser = require('body-parser')
var mongoose = require('mongoose')
var path = require('path')
var env = require('dotenv')
var io = require('socket.io')(http);
const fs = require("fs")
const {Kafka} = require('kafkajs')
var cors = require('cors');

const topicController = require('./src/controllers/topicController')

env.config()

io.on('connection', (socket) => {
    console.log('a user connected')
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

global.localSocket = io

global.appRoot = path.resolve(__dirname);

app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb'}))
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

app.use(cors())

app.use('/static', express.static(__dirname + '/public'));

// Connect to MongoDB
mongoose
    .connect(
        process.env.MONGO_DB_PERS,
        {useNewUrlParser: true}
    )
    .then(() => console.log('MongoDB Connected (LOCAL)'))
    .catch(err => console.log(err));


global.kafkaBrokers = [process.env.KAFKA_IP + ":" + process.env.KAFKA_PORT_EXT]
global.kafkaDynamicTopics = {}

const kafka = new Kafka({
    clientId: 'node-controller-static',
    brokers: global.kafkaBrokers
})
const consumer = kafka.consumer({groupId: "static-services"})

consumer.connect()
consumer.subscribe({topic: "service.domainmanager", fromBeginning: false})
consumer.subscribe({topic: "service.missionmanager", fromBeginning: false})
consumer.subscribe({topic: "service.replaymanager", fromBeginning: false})

consumer.run({
    eachMessage: async ({topic, partition, message}) => {
        console.log("new message", topic)
        switch (topic) {
            case "service.domainmanager":
                topicController.handleDomain(message)
                break
            case "service.missionmanager":
                topicController.handleMission(message)
                break
            case 'service.replaymanager':
                topicController.handleReplay(message)
                break
        }
    }
})

app.use(cors({origin: '*'}))
var routes = require('./src/routes/routes')
routes(app)

//Middleware
app.use(express.json())

// http
http.listen(process.env.WEB_SERVER_PORT_INT, process.env.WEB_SERVER_ADDRESS, function () {
    console.log('Node Server listening on port ' + process.env.WEB_SERVER_PORT_INT)
})
