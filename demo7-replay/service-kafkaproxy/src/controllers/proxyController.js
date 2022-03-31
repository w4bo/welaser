const axios = require('axios');
const { response } = require('express')
const HttpStatus = require('http-status-codes')
const crypto = require("crypto");
const {Kafka} = require("kafkajs")

exports.registerTopic = async function(req, res) {

  let topic = req.params.topic
  address = topic + "." + crypto.randomBytes(16).toString("hex")

  data = {
    "socket": `${address}`
  }

  kafka = new Kafka({
    clientId: address,
    brokers: global.kafkaBrokers
  })
  console.log(global.kafkaBrokers)
  consumer = kafka.consumer({groupId: address})
  consume = async (address, topic) => {
  	await consumer.connect()
  	console.log(topic, address)
	  await consumer.subscribe({ topic })
	  await consumer.run({
		  eachMessage: ({ message }) => {
        global.io.emit(address, message.value.toString())
		  },
	  })
  }

  consume(address, topic).catch((err) => {
	  console.error("error in consumer: ", err)
  })

  res.status(HttpStatus.OK).json(data)

}
