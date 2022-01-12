const mongoose = require('mongoose')
const HttpStatus = require('http-status-codes');


exports.test = function(req, res){
  console.log(`test called`)
  res.status(HttpStatus.OK).send(`{"ok": "ok"}`)
}

exports.handleNotifyTest = function(req, res){
  console.log(`handleNotifyTest called`)
  console.log(req.body)
  global.io.emit("test-notification", req.body)
  res.status(HttpStatus.OK).send(`{"ok": "ok"}`)
}