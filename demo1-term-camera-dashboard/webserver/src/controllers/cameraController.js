const mongoose = require('mongoose')
const HttpStatus = require('http-status-codes');
const Camera = require("../models/cameraModel")(mongoose)
const axios = require('axios');
const { response } = require('express');

async function cameraExists (camera) {
  let result = await Camera.findOne({id: camera})
  return result != null
}

exports.notification = async function (req, res){
  for (index in req.body.data) {
    let camera = req.body.data[index]
    console.log(camera)
    let cameraID = camera.id
    let status = camera.Status
    let image = camera.Image
    let time = camera.Time
    console.log(`newimage: ${cameraID} at ${time}`)
    let exists = await cameraExists(cameraID)
    if (exists) {
      console.log("update status")
      await Camera.findOneAndUpdate({id:cameraID}, {
        image: image,
        isOn:status,
        time:time
      }, function(err, camera) {
      })
    } else {
      console.log("create camera")
      camera = new Camera({
        id: cameraID,
        image: image,
        isOn: status
      })
      await camera.save()
    }
  }
  global.io.emit("camera-update", "")
  res.status(HttpStatus.OK).send()
}

exports.getAll = async function(req, res){
  Camera.find({}, function(err, result) {
    if(err) {
      res.send(err)
    } else {
      res.status(HttpStatus.OK).json(result)
    }
  })
}

exports.turnOff = async function(req, res){
  let camera = req.params.cameraid
  console.log(`turn off camera: ${camera}`)
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
  axios.patch(`http://${process.env.OCB_IP}:${process.env.OCB_PORT}/v2/entities/${camera}/attrs`, data, headers)
    .then(response => {
      res.status(HttpStatus.OK).send()
    })

}

exports.turnOn = async function(req, res){
  let camera = req.params.cameraid
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
  axios.patch(`http://${process.env.OCB_IP}:${process.env.OCB_PORT}/v2/entities/${camera}/attrs`, data, headers)
    .then(response => {
      res.status(HttpStatus.OK).send()
    })
}

exports.update = async function(req, res){
  let camera = req.params.cameraid
  let headers = {
    headers: {
      'fiware-service': process.env.FIWARE_SERVICE,
      'fiware-servicepath': process.env.FIWARE_SERVICEPATH,
      'Content-Type': 'application/json'
    }
  }
  let data = {
    "update" : {
      "type": "command",
      "value": ""
    }
  }
  axios.patch(`http://${process.env.OCB_IP}:${process.env.OCB_PORT}/v2/entities/${camera}/attrs`, data, headers)
    .then(response => {
      res.status(HttpStatus.OK).send()
    })
}
