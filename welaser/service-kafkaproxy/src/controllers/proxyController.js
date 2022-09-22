const axios = require('axios');
const {response} = require('express')
const HttpStatus = require('http-status-codes')
const crypto = require("crypto");
const {Kafka} = require("kafkajs")

exports.registerTopic = async function (req, res) {
    const topic = req.params.topic
    const address = topic + "." + crypto.randomBytes(16).toString("hex")
    const data = { "socket": `${address}` }
    const kafka = new Kafka({
        clientId: address,
        brokers: global.kafkaBrokers
    })
    // console.log(global.kafkaBrokers)
    const consumer = kafka.consumer({groupId: address})
    // const consumer = kafka.consumer()
    const consume = async (address, topic) => {
        await consumer.connect()
        await consumer.subscribe({topic})
        await consumer.run({
            eachMessage: ({message}) => {
                // console.log(message.value.toString())
                global.io.emit(address, message.value.toString())
            },
        })
    }
    consume(address, topic).catch((err) => {
        console.error("error in consumer: ", err)
    })
    res.status(HttpStatus.OK).json(data)
}
