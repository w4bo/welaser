'use strict';
require("dotenv").config()
const mqtt = require('mqtt')
const ID = process.env.ID
const FIWARE_API_KEY = process.env.FIWARE_API_KEY
const MOSQUITTO_IP = process.env.MOSQUITTO_IP
const MOSQUITTO_PORT_EXT = process.env.MOSQUITTO_PORT_EXT
const MOSQUITTO_USER = process.env.MOSQUITTO_USER
const MOSQUITTO_PWD = process.env.MOSQUITTO_PWD
const MOVE = process.env.MOVE == "true"
const WHERE = process.env.WHERE || "Cesena"
const fs = require('fs')

var isEnabled = process.env.STATUS == "on"
var TIME = process.env.TIME
var latitude = parseFloat(process.env.INITIAL_LATITUDE) || 44.14809860998143
var longitude = parseFloat(process.env.INITIAL_LONGITUDE) || 12.14809860998143
var image = null
var simulator = null

const mqttclient = mqtt.connect(
    "mqtt://" + MOSQUITTO_IP, {
        port: MOSQUITTO_PORT_EXT,
        username: MOSQUITTO_USER,
        password: MOSQUITTO_PWD
    }
)

// Publish the current status
function publishStatus() {
    mqttclient.publish(`/${FIWARE_API_KEY}/camera${ID}/attrs`, `{
        "stat": ${isEnabled},
        "time": ${getMillis()},
        "where": "${WHERE}"
    }`)
}

// Publish all the information
function publishData() {
    mqttclient.publish(`/${FIWARE_API_KEY}/camera${ID}/attrs`, `{
        "img": "${image}",
        "stat": ${isEnabled},
        "time": ${getMillis()},
        "lat": ${latitude},
        "lon": ${longitude}
   }`)
}

// Publish the result of the last executed command
function publishCommandStatus(command, status) {
    mqttclient.publish(`/${FIWARE_API_KEY}/camera${ID}/cmdexe`, `{"${command}": "${status}"}`)
}

// Register the periodic execution of the simulator
function registersimulator() {
    simulator = setInterval(simulatorLogic, TIME)
}

// Stop the execution of the simulator
function deRegistersimulator() {
    clearInterval(simulator)
}

// Get the current time, in milliseconds
function getMillis() {
    let date = new Date()
    return date.getTime()
}

// Reads a random image from the `img` folder
function updateImageRandom() {
    fs.readdir("img", (err, files) => {
        let index = Math.floor(Math.random() * files.length)
        let file = files[index]
        fs.readFile(`img/${file}`, function (err, data) {
            image = Buffer.from(data).toString('base64')
        })
    })
}

// Updates the current position
function updatePositionRandom() {
    latitude = latitude + ((Math.floor(Math.random() * 10) / 100000)) * (Math.floor(Math.random() * 10) % 2 === 1 ? -1 : 1)
    longitude = longitude + ((Math.floor(Math.random() * 10) / 100000)) * (Math.floor(Math.random() * 10) % 2 === 1 ? -1 : 1)
}


function simulatorLogic() {
    if (isEnabled) {
        updateImageRandom()
        if (MOVE) {
            updatePositionRandom()
        }
        publishData()
    } else {
        console.log(`[camera${ID}]: disabled`)
    }
}

mqttclient.on("connect", function () {
    console.log(`[camera${ID}]: connection established`)
    // Tells fiware if i'm already on or not
    publishStatus()
    // fiware will publish commands on this topic
    mqttclient.subscribe(`/${FIWARE_API_KEY}/camera${ID}/cmd`)
    if (isEnabled) {
        registersimulator()
    }
})

// Handle messages received from the broker
mqttclient.on('message', function (topic, message) {
    let command = Object.keys(JSON.parse(message))[0]
    switch (command) {
        // Register the periodic execution of the simulation
        case "on":
            isEnabled = true
            registersimulator()
            publishStatus()
            publishCommandStatus("on", "ok")
            break;
        // Removes the periodic execution of the simulation
        case "off":
            isEnabled = false
            publishStatus()
            deRegistersimulator()
            publishCommandStatus("off", "ok")
            break;
    }
})
