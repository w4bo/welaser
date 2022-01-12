'use strict';
/*
  In tutti i punti in cui comunico con fiware trasmettere anche il timestamp riferito all'invio del messaggio

*/

const mqtt = require('mqtt')
const fs = require('fs')
require("dotenv").config()

const ID = process.env.ID
const KEY = process.env.KEY || "4jggokgpepnvsb2uv4s40d59ov"
const MOSQUITTO = process.env.MOSQUITTO || "mqtt://mosquitto"
const MOSQUITTO_PORT = process.env.MOSQUITTO_PORT || 1883
var isEnabled = process.env.STATUS == "on"
var TIME = process.env.TIME || 1000
const MQTT_USER = process.env.MQTT_USER || "user"
const MQTT_PWD = process.env.MQTT_PWD || "password"
const PAYLOAD_KB = process.env.PAYLOAD_KB || 1


console.log(MOSQUITTO)

var client  = mqtt.connect(`${MOSQUITTO}`, {
  port: MOSQUITTO_PORT,
  username: `${MQTT_USER}`,
  password: `${MQTT_PWD}`
})
console.log(client)

var measurer = null


function randomString(length) {
  const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
  var result = '';
  for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

function publishStatus() {
  client.publish(`/${KEY}/thermometer${ID}/attrs`, `{"s": ${isEnabled}, "time":${getMillis()}}`)
}

function publishData(t) {
  client.publish(`/${KEY}/thermometer${ID}/attrs`, `{"t": ${t}, "s":${isEnabled}, "time":${getMillis()}, "p":"${randomString(PAYLOAD_KB)}"}`)
}

function publishCommandStatus(command, status) {
  client.publish(`/${KEY}/thermometer${ID}/cmdexe`, `{"${command}": "${status}"}`)
}

function registerMeasuerer(){
  measurer = setInterval(measure, TIME)
}

function deRegisterMeasurer(){
  clearInterval(measurer)
}

function getMillis(){
  let date = new Date()
  return date.getTime()
}

function measure(){
  if (isEnabled) {
    let num = Math.floor(Math.random() * 10) + 0.5;
    publishData(num)
    console.log(`[term${ID}]: new term = ${num}`)
  } else {
    console.log(`[term${ID}]: disabled`)
  }
}



client.on("connect", function() {
  console.log(`[term${ID}]: connection enstablished`)
  /**
   * Tells fiware if i'm already on or not
   */
  publishStatus()

  /**
   * fiware will publish commands on this topic
   */
  client.subscribe(`/${KEY}/thermometer${ID}/cmd`)

  if (isEnabled) {
    registerMeasuerer()
  }

})


/**
 * Hadles messages recevied from the broker
 */
client.on('message', function (topic, message) {
  console.log(`topic: ${topic.toString()}`)
  console.log(`message: ${message.toString()}`)
  let command = Object.keys(JSON.parse(message))[0]
  switch (command) {
    case "on":
      isEnabled = true
      registerMeasuerer()
      publishStatus()
      publishCommandStatus("on", "ok")
      client.publish(`/${KEY}/thermometer${ID}/cmdexe`, `{"on": "ok"}`)
      break;

    case "off":
      isEnabled = false
      deRegisterMeasurer()
      publishStatus()
      publishCommandStatus("off", "ok")
      break;
  }
})
