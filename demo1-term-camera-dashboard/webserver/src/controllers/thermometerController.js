const mongoose = require('mongoose')
const HttpStatus = require('http-status-codes');
const Thermometer = require("../models/thermometerModel")(mongoose)
const axios = require('axios');
const { response } = require('express');

async function thermometerExists (therm) {
  let result = await Thermometer.findOne({id: therm})
  return result != null
}

exports.notification = async function (req, res){
console.log("update called")
for (index in req.body.data) {
    let therm = req.body.data[index]
    console.log(therm)
    let thermID = therm.id
    let status = therm.Status
    let temperature = therm.Temperature
    let time = therm.Time
    console.log(`NET TEMP: ${temperature} on ${thermID} at ${time}`)
    let exists = await thermometerExists(thermID)
    if (exists) {
      console.log("update status")
      await Thermometer.findOneAndUpdate({id:thermID}, {
        temperature: temperature,
        isOn:status,
        time:time
      }, function(err, therm) {
      })
    } else {
      console.log("create therm")
      therm = new Thermometer({
        id: thermID,
        temperature: temperature,
        isOn: status
      })
      await therm.save()
    }
  }
  global.io.emit("therm-update", "")
  res.status(HttpStatus.OK).send()
}

exports.getAll = async function(req, res){
  Thermometer.find({}, function(err, result) {
    if(err) {
      res.send(err)
    } else {
      res.status(HttpStatus.OK).json(result)
    }
  })
}

exports.turnOff = async function(req, res){
  let therm = req.params.thermid
  console.log(`turn off therm: ${therm}`)
  let headers = {
    headers: {
      'fiware-service': process.env.FIWARE_SERVICE,
      'fiware-servicepath': process.env.FIWARE_SERVICEPATH,
      'Content-Type': 'application/json'
    }
  }
  let data = {
    "off" : {
      "type": "command",
      "value": ""
    }
  }
  axios.patch(`http://${process.env.OCB_IP}:${process.env.OCB_PORT}/v2/entities/${therm}/attrs`, data, headers)
    .then(response => {
      res.status(HttpStatus.OK).send()
    })

}

exports.turnOn = async function(req, res){
  let therm = req.params.thermid
  let headers = {
    headers: {
      'fiware-service': process.env.FIWARE_SERVICE,
      'fiware-servicepath': process.env.FIWARE_SERVICEPATH,
      'Content-Type': 'application/json'
    }
  }
  let data = {
    "on" : {
      "type": "command",
      "value": ""
    }
  }
  axios.patch(`http://${process.env.OCB_IP}:${process.env.OCB_PORT}/v2/entities/${therm}/attrs`, data, headers)
    .then(response => {
      res.status(HttpStatus.OK).send()
    })
}
