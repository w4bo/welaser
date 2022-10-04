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
const kafka = new Kafka({ // create the Kafka client
    clientId: "kafka-proxy." + uuid.v4(),
    brokers: [process.env.KAFKA_IP + ":" + process.env.KAFKA_PORT_EXT],
    logLevel: logLevel.ERROR
})
const producer = kafka.producer({allowAutoTopicCreation: true}) // create a Kafka producer
producer.connect() // ... and connect it
io.on("connection", function (socket) { // when a new socket.io connects...
    let consumer = undefined // set up a dummy Kafka consumer
    socket.on("publish", function (data) { // when the socket receives a message with topic "publish"
        producer.send({topic: data.topic, messages: [{value: JSON.stringify(data.data)}]}) // send it to kafka through the producer
        console.log("Sending: " + data.topic + " " + JSON.stringify(data.data))
    })
    socket.on("newtopic", function (topic) { // when the socket receives a message with topic "newtopic" (i.e., when changing the topic)
        if (typeof consumer !== "undefined") { // ... remove the previous Kafka client (if any)
            console.log('Kafka client disconnected');
            consumer.disconnect() // disconnect the kafka consumer
        }
        console.log("Received a new topic: " + topic)
        const groupId = topic + ".group." + uuid.v4() // create a unique groupId for the consumer
        console.log("Registering a new Kafka consumer with group: " + groupId)
        consumer = kafka.consumer({groupId}) // ... and register it
        const consume = async (topic) => {
            await consumer.connect() // connect a Kafka client
            const p = {topic}
            p.fromBeginning = false
            await consumer.subscribe(p) // subscribe to the topic
            const admin = kafka.admin() // need to be admin to reset the offset
            await admin.connect()
            await admin.resetOffsets({ groupId, topic }) // rest the offset to "latest"
            await admin.disconnect()
            console.log("Listening to: " + topic)
            consumer.run({
                eachMessage: ({message}) => { // forward the message to the socket
                    console.log("Received: " + JSON.stringify(message))
                    socket.emit(topic, message.value.toString())
                }
            })
        }
        consume(topic).catch((err) => { console.error("Error in consumer: ", err) })
    })
    // socket.on('disconnect', function() {
    //     console.log('Socket disconnected');
    //     if (typeof consumer !== "undefined") { // when changing the topic, remove the previous Kafka client (if any)
    //         console.log('Kafka client disconnected');
    //         consumer.disconnect() // disconnect the kafka consumer
    //     }
    // });
})
server.listen(process.env.PROXY_SERVER_PORT_INT, process.env.PROXY_SERVER_ADDRESS, function () {
    console.log('Node Server listening on port ' + process.env.PROXY_SERVER_PORT_INT)
})
