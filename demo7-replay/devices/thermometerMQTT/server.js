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

var isEnabled = process.env.STATUS == "on"
var TIME = process.env.TIME
var temperature = null
var latitude = parseFloat(process.env.INITIAL_LATITUDE) || 44.14809860998143
var longitude = parseFloat(process.env.INITIAL_LONGITUDE) || 12.14809860998143
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
    mqttclient.publish(`/${FIWARE_API_KEY}/thermometer${ID}/attrs`, `{
        "stat": ${isEnabled},
        "time": ${getMillis()},
        "where": "${WHERE}"
    }`)
}

// Publish all the information
function publishData() {
    mqttclient.publish(`/${FIWARE_API_KEY}/thermometer${ID}/attrs`, `{
        "temp": ${temperature},
        "stat": ${isEnabled},
        "time": ${getMillis()},
        "lat": ${latitude},
        "lon": ${longitude}
    }`)
}

// Publish the result of the last executed command
function publishCommandStatus(command, status) {
    mqttclient.publish(`/${FIWARE_API_KEY}/thermometer${ID}/cmdexe`, `{"${command}": "${status}"}`)
}


// Register the periodic execution of the simulator
function registerSimulator() {
    simulator = setInterval(simulatorLogic, TIME)
}

// Stop the execution of the simulation
function deRegistersimulator() {
    clearInterval(simulator)
}

// Get the current time, in millisencods
function getMillis() {
    let date = new Date()
    return date.getTime()
}

// Generates a random reading
function updateTemperature() {
    temperature = Math.floor(Math.random() * 10) + 0.5;
}

// Updates the current position
function updatePositionRandom() {
    latitude = latitude + ((Math.floor(Math.random() * 10) / 100000))// (Math.floor(Math.random()// 10) % 2 === 1 ? -1 : 1)
    longitude = longitude + ((Math.floor(Math.random() * 10) / 100000))// (Math.floor(Math.random()// 10) % 2 === 1 ? -1 : 1)
}

function simulatorLogic() {
    if (isEnabled) {
        console.log(`[term${ID}]: tick`)
        if(MOVE) {updatePositionRandom()}
        updateTemperature()
        publishData()
    } else {
        console.log(`[term${ID}]: disabled`)
    }
}

// Setup after mosquitto connections
mqttclient.on("connect", function () {
    console.log(`[term${ID}]: connection enstablished`)
    // Tells fiware the initial status
    publishStatus()
    // FIWARE will publish commands on this topic, so we need to list to this
    mqttclient.subscribe(`/${FIWARE_API_KEY}/thermometer${ID}/cmd`)
    // the callback is defined at mqttclient.on('message', ...). By default, the library listens to a generic "message" that will be parsed by the callback
    // if the device boots as enabled the simulation is started
    if (isEnabled) {
        registerSimulator()
    }
})


// Handles messages received from the broker, i.e. commands
mqttclient.on('message', function (topic, message) {
    const command = Object.keys(JSON.parse(message))[0]
    switch (command) {
        // Register the periodic execution of the simulation
        case "on":
            isEnabled = true
            registerSimulator()
            publishStatus()
            publishCommandStatus("on", "ok")
            break;
        // Removes the periodic execution of the simulation
        case "off":
            isEnabled = false
            deRegistersimulator()
            publishStatus()
            publishCommandStatus("off", "ok")
            break;
    }
})
