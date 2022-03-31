const express = require('express')
const app = express()
const server = require('http').createServer(app)
const cors = require('cors')
const env = require('dotenv')
const io = require('socket.io')(server);
const {Kafka} = require("kafkajs")

env.config()
console.log(process.env);

global.kafkaBrokers = [process.env.KAFKA_IP + ":" + process.env.KAFKA_PORT_EXT]
global.io = io

kafka = new Kafka({
    clientId: "kafka-proxy",
    brokers: global.kafkaBrokers
})
producer = kafka.producer()
producer.connect()
global.producerKafka = producer


global.io.on("connection", function (client) {
    console.log("user connected")
    client.on("publish", function (data) {
        console.log("event received", data.topic, data.data)
        global.producerKafka.send({
            topic: data.topic,
            messages: [{value: JSON.stringify(data.data)}],
        })
    })
})

app.use(cors({origin: '*'}))
var routes = require('./src/routes/routes')
routes(app)

//Middleware
app.use(express.json())

// http
server.listen(process.env.PROXY_SERVER_PORT_INT, process.env.PROXY_SERVER_ADDRESS, function () {
    console.log('Node Server listening on port ' + process.env.PROXY_SERVER_PORT_INT)
})
