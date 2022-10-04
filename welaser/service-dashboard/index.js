const express = require('express')
const app = express()
const expressip = require('express-ip')
app.use(expressip().getIpInfoMiddleware)
const http = require('http').createServer(app)
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const path = require('path')
const env = require('dotenv')
const io = require('socket.io')(http)
const cors = require('cors')

env.config()
global.appRoot = path.resolve(__dirname)

// io.on('connection', (socket) => {
//     console.log('Socket connected')
//     socket.on('disconnect', () => {
//         console.log('Socket disconnected')
//     })
// })
// global.localSocket = io

app.use(express.json({limit: '50mb'}))
app.use(express.urlencoded({limit: '50mb'}))
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())
app.use(cors())
app.use('/static', express.static(__dirname + '/public'))
app.use(cors({origin: '*'}))
app.use(express.json())

const routes = require('./src/routes/routes')
routes(app)

// const ip = "mongodb://" + process.env.MONGO_DB_PERS_IP + ":" + process.env.MONGO_DB_PERS_PORT_EXT + "/" + process.env.MONGO_DB_PERS_DB
// Connect to MongoDB
// mongoose
//     .connect(ip, {useNewUrlParser: true})
//     .then(() => console.log('MongoDB connected'))
//     .catch(err => {
//         console.log(ip)
//         console.log(err)
//     })


// global.kafkaBrokers = [process.env.KAFKA_IP + ":" + process.env.KAFKA_PORT_EXT]
// global.kafkaDynamicTopics = {}
// const {Kafka} = require('kafkajs')
// const topicController = require('./src/controllers/topicController')
// const kafka = new Kafka({
//     clientId: 'node-controller-static',
//     brokers: global.kafkaBrokers
// })
// const consumer = kafka.consumer({groupId: "static-services"})
// consumer.connect()
// consumer.subscribe({topic: "service.domainmanager", fromBeginning: false})
// consumer.subscribe({topic: "service.missionmanager", fromBeginning: false})
// consumer.subscribe({topic: "service.replaymanager", fromBeginning: false})
// consumer.run({
//     eachMessage: async ({topic, partition, message}) => {
//         console.log("new message", topic)
//         switch (topic) {
//             case "service.domainmanager":
//                 topicController.handleDomain(message)
//                 break
//             case "service.missionmanager":
//                 topicController.handleMission(message)
//                 break
//             case 'service.replaymanager':
//                 topicController.handleReplay(message)
//                 break
//         }
//     }
// })

http.listen(process.env.WEB_SERVER_PORT_INT, "0.0.0.0", function () {
    console.log('Node Server listening on port ' + process.env.WEB_SERVER_PORT_INT)
})
