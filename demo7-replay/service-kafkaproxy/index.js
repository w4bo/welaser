const express = require('express')
const app = express()
const server = require('http').createServer(app)
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const cors = require('cors')
const path = require('path')
const env = require('dotenv')
const io = require('socket.io')(server);
const fs = require("fs")
const { Kafka } = require("kafkajs")
env.config()
global.kafkaBrokers = [process.env.KAFKA_IP + ":" + process.env.KAFKA_PORT]
global.io = io

kafka = new Kafka({
  clientId: "kafka-proxy",
  brokers: global.kafkaBrokers
})
producer = kafka.producer()
producer.connect()
global.producerKafka = producer


global.io.on("connection", function(client){
  console.log("user connected")
  client.on("publish", function(data){
    console.log("event received", data.topic, data.data)
    global.producerKafka.send({
      topic: data.topic,
      messages: [{ value: JSON.stringify(data.data) }],
    })
  })
})

app.use(cors({origin: '*'}))
var routes = require('./src/routes/routes')
routes(app)

//Middleware
app.use(express.json())

// http
server.listen(process.env.SERVER_PORT, process.env.SERVER_ADDRESS, function() {
  console.log('Node Server listening on port ' + process.env.SERVER_PORT)
})
