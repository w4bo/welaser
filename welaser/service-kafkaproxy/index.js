const express = require('express')
const app = express()
const server = require('http').createServer(app)
const cors = require('cors')
const env = require('dotenv')
const io = require('socket.io')(server);
const {Kafka, logLevel} = require("kafkajs")
const uuid = require('uuid');
app.use(cors({origin: '*'}))
app.use(express.json())
env.config() // load the environment variables
const kafkaBrokers = [process.env.KAFKA_IP + ":" + process.env.KAFKA_PORT_EXT]
const kafka = new Kafka({
    clientId: "kafka-proxy." + uuid.v4(),
    brokers: kafkaBrokers,
    logLevel: logLevel.ERROR
})
const producerKafka = kafka.producer()
producerKafka.connect()
io.on("connection", function (socket) {
    let consumer = undefined
    let prevTopic = undefined
    socket.on("publish", function (data) { // when the socket receives a message with topic "publish"
        producerKafka.send({topic: data.topic, messages: [{value: JSON.stringify(data.data)}]}) // send it to kafka
    })
    socket.on("newtopic", function (topic) { // when the socket receives a message with topic "newtopic"
        if (topic == prevTopic) return // if the topic is the same as before do nothing
        prevTopic = topic
        if (typeof consumer !== "undefined") { // when changing the topic, remove the previous Kafka client (if any)
            console.log('Kafka client disconnected');
            consumer.disconnect() // disconnect the kafka consumer
        }
        console.log("Received a new topic: " + topic)
        const groupId = topic + ".group." + uuid.v4()
        console.log("Registering a new Kafka consumer with group: " + groupId)
        consumer = kafka.consumer({groupId})
        const consume = async (topic) => {
            await consumer.connect() // connect a Kafka client
            const p = {topic}
            p.fromBeginning = false
            await consumer.subscribe(p) // subscribe to the topic
            const admin = kafka.admin()
            await admin.connect()
            await admin.resetOffsets({ groupId, topic }) // rest the offset to "latest"
            await admin.disconnect()
            consumer.run({
                eachMessage: ({message}) => { // forward the message to the socket
                    socket.emit(topic, message.value.toString())
                }
            })
        }
        consume(topic).catch((err) => { console.error(err) })
    })
    socket.on('disconnect', function() {
        console.log('Socket disconnected')
        if (typeof consumer !== "undefined") { // when changing the topic, remove the previous Kafka client (if any)
            console.log('Kafka client disconnected')
            consumer.disconnect() // disconnect the kafka consumer
        }
    })
})
server.listen(process.env.PROXY_SERVER_PORT_INT, process.env.PROXY_SERVER_ADDRESS, function () {
    console.log('Node Server listening on port ' + process.env.PROXY_SERVER_PORT_INT)
})
