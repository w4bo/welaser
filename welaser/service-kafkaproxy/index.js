const express = require('express')
const app = express()
const server = require('http').createServer(app)
const cors = require('cors')
const env = require('dotenv')
const io = require('socket.io')(server);
const {Kafka, logLevel} = require("kafkajs")
const uuid = require('uuid');
app.use(cors({origin: '*'})) // enable cross domain requests
app.use(express.json())
app.disable('etag');
app.get('/', function (req, res) { res.status(200).json({}) })

env.config() // load the environment variables
const kafkaBrokers = [process.env.KAFKA_IP + ":" + process.env.KAFKA_PORT_EXT]
const kafka = new Kafka({
    clientId: "kafka-proxy." + uuid.v4(),
    brokers: kafkaBrokers,
    logLevel: logLevel.ERROR
})
const producerKafka = kafka.producer()
producerKafka.connect()

/*
 * General idea:
 * - Cache a Kafka consumer for every topic requested through "newtopic" (i.e., one consumer per topic)
 * - Each socket will join the "newtopic" room and leave the previous room (if any)
 * - Kafka consumer broadcast messages to their respective rooms
 */
const consumers = {}

io.on("connection", function (socket) {
    let prevTopic = undefined
    socket.on("publish", function (data) { // when the socket receives a message with topic "publish"
        producerKafka.send({topic: data.topic, messages: [{value: JSON.stringify(data.data)}]}) // send it to kafka
    })
    socket.on("newtopic", async function (topic) { // when the socket receives a message with topic "newtopic"
        if (typeof consumers[topic] === "undefined") { // if there is no costumer for the requested topic...
            // https://stackoverflow.com/questions/63566301/waiting-for-leadership-elections-in-kafkajs
            const admin = kafka.admin()
            await admin.connect()
            if (!(await admin.listTopics()).some((t) => topic === t)) { // create the topic if not exists
                console.log("Creating the topic: " + topic)
                await admin.createTopics({ waitForLeaders: true, topics: [ { topic: topic } ] })
            }
            await admin.disconnect()
            // --- end
            const groupId = topic + ".group." + uuid.v4() // create a unique consumer group
            console.log("Registering a new Kafka consumer with group: " + groupId)
            const consumer = kafka.consumer({groupId}) // initialize the consumer
            consumers[topic] = consumer // cache the consumer
            const consume = async (topic) => {
                await consumer.connect() // connect a Kafka client
                const p = {topic}
                p.fromBeginning = false
                await consumer.subscribe(p) // subscribe to the topic
                console.log("Listening to: " + topic)
                const admin = kafka.admin()
                await admin.connect()
                await admin.resetOffsets({ groupId, topic }) // reset the offset to "latest" (i.e., ignore old messages)
                await admin.disconnect()
                consumer.run({
                    eachMessage: ({message}) => { // forward the message to the socket
                        io.to(topic).emit(topic, message.value.toString()) // broadcast the message to the room
                    }
                })
            }
            consume(topic).catch((err) => { console.error(err) })
        }
        if (topic === prevTopic) return // if the topic is the same as before do nothing
        if (prevTopic) {
            socket.leave(prevTopic)
            console.log("Leaving: " + prevTopic)
        }
        socket.join(topic)
        console.log("Joining: " + topic)
        prevTopic = topic
    })
})
server.listen(process.env.PROXY_PORT_INT, '0.0.0.0', function () {
    console.log('Node Server listening on port ' + process.env.PROXY_PORT_INT)
})
