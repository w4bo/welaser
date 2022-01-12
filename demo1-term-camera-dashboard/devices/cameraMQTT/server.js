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

var publisher = null

var client  = mqtt.connect(`${MOSQUITTO}`, {
  port: MOSQUITTO_PORT,
  username: `${MQTT_USER}`,
  password: `${MQTT_PWD}`
})

function randomString(length) {
  const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
  var result = '';
  for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

function publishStatus() {
  client.publish(`/${KEY}/camera${ID}/attrs`, `{"s": ${isEnabled}, "t":${getMillis()}}`)
}

function publishData(image) {
  let date = new Date()
  client.publish(`/${KEY}/camera${ID}/attrs`, `{"i":"${image}", "s":${isEnabled}, "t":${date.getTime()}}`)
}

function publishCommandStatus(command, status) {
  client.publish(`/${KEY}/camera${ID}/cmdexe`, `{"${command}": "${status}"}`)
}

function registerPublisher(){
  publisher = setInterval(publish, TIME)
}

function deRegisterPublisher(){
  clearInterval(publisher)
}

function getMillis(){
  let date = new Date()
  return date.getTime()
}

function publish(){
  if (isEnabled) {
    fs.readdir("img", (err, files) => {
      console.log(files)
      var index = Math.floor(Math.random()*files.length)
      console.log(index)
      var file = files[index]
      fs.readFile(`img/${file}`, function(err, data) {
        console.log(data)
        publishData(Buffer.from(data).toString('base64'))
      })
    });
    console.log(`[camera${ID}]: image sent`)
  } else {
    console.log(`[camera${ID}]: disabled`)
  }
}

client.on("connect", function() {
  console.log(`[camera${ID}]: connection enstablished`)

  /**
   * Tells fiware if i'm already on or not
   */
  publishStatus()

  /**
   * fiware will publish commands on this topic
   */
  client.subscribe(`/${KEY}/camera${ID}/cmd`)

  if (isEnabled) {
    registerPublisher()
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
      registerPublisher()
      publishStatus()
      publishCommandStatus("on", "ok")
      client.publish(`/${KEY}/camera${ID}/cmdexe`, `{"on": "ok"}`)
      break;

    case "off":
      isEnabled = false
      publishStatus()
      deRegisterPublisher()
      publishCommandStatus("off", "ok")
      break;

    case "update":
      publishCommandStatus("update", "ok")
      break;
  }
})
