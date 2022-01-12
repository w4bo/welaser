const mongoose = require("mongoose")
const Topic = require("../models/topicModel")(mongoose)
const HttpStatus = require('http-status-codes');

exports.handleDomain = async function(message) {
  let decodedMessage = JSON.parse(message.value.toString())
  if (decodedMessage.type == "response" && decodedMessage.status == "created") {
    await createTopic(decodedMessage.domain, decodedMessage.topic, "domain")
  }
}

exports.handleMission = async function(message) {
  let decodedMessage = JSON.parse(message.value.toString())
  if (decodedMessage.type == "response" && decodedMessage.status == "created") {
    await createTopic(decodedMessage.domain, decodedMessage.domain_topic, "domain")
    await createTopic(`${decodedMessage.mission}`, decodedMessage.mission_topic, "mission")
  }
  if (decodedMessage.type == "response" && decodedMessage.status == "deleted") {
    //await deleteTopic(decodedMessage.mission)
  }
}

exports.handleReplay = async function(message) {
  let decodedMessage = JSON.parse(message.value.toString())
  if (decodedMessage.type == "response" && decodedMessage.status == "created") {
    await createTopic(`${decodedMessage.replay}`, decodedMessage.topic, "replay")
  }
   if (decodedMessage.type == "response" && decodedMessage.status == "deleted") {
    //await deleteTopic(decodedMessage.replay)
  }
}

exports.getAll = async function(req, res) {
  Topic.find({}, function(err, result){
    if(err) {
      res.send(err)
    } else {
      res.status(HttpStatus.OK).json(result)
    }
  })
}

exports.getKind = async function(req, res) {
  kind = req.params.kind
  console.log("get", kind)
  Topic.find({kind: {"$eq": kind}}, function(err, result){
    if(err) {
      res.send(err)
    } else {
      res.status(HttpStatus.OK).json(result)
    }
  })
}

createTopic = async function(topicName, topicAddress, kind) {
  Topic.create(
    {id: topicName, topic: topicAddress, kind},
    function(err, doc){
      this.localSocket.emit("updateTopic", {type: "created", data: doc})
    }
  )
}

deleteTopic = async function(topicID) {
  Topic.deleteOne({id: topicID}, function(err, doc){
    this.localSocket.emit("updateTopic", {type: "deleted", data: doc})
  })
}
