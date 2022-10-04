const HttpStatus = require('http-status-codes')
const {Kafka} = require("kafkajs")
const uuid = require('uuid');

exports.registerTopic = async function (req, res) {
    // const topic = req.params.topic
    // const address = topic + ".client." + uuid.v4()
    // console.log(address)
    // const data = { "socket": `${address}` }
    // const kafka = new Kafka({
    //     clientId: address,
    //     brokers: global.kafkaBrokers
    // })
    // const consumer = kafka.consumer({groupId: topic + ".group." + uuid.v4()})
    // const consume = async (address, topic) => {
    //     await consumer.connect()
    //     await consumer.subscribe({topic})
    //     await consumer.run({
    //         eachMessage: ({message}) => {
    //             global.io.emit(address, message.value.toString())
    //         },
    //     })
    // }
    // consume(address, topic).catch((err) => {
    //     console.error("error in consumer: ", err)
    // })
    // res.status(HttpStatus.OK).json(data)
}
