const mongoose = require("mongoose")
const Entity = require("../models/entityModel")(mongoose)
const HttpStatus = require('http-status-codes');

exports.getAll = async function (req, res) {
    Entity
        .find({}, function (err, result) {
            if (err) {
                res.send(err)
            } else {
                res.status(HttpStatus.OK).json(result)
            }
        })
        .limit(1)
}