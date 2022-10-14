const MongoClient = require('mongodb').MongoClient
const HttpStatus = require('http-status-codes')
const env = require('dotenv')
env.config() // load the environment variables
const url = 'mongodb://' + process.env.MONGO_DB_PERS_IP + ':' + process.env.MONGO_DB_PERS_PORT_EXT

function connect(next) {
    MongoClient.connect(url, function (err, db) {
        if (err) throw err
        const dbo = db.db(process.env.MONGO_DB_PERS_DB)
        next(dbo)
        db.close()
    })
}

function send(res, err, result) {
    if (err) {
        res.send(err)
    } else {
        res.status(HttpStatus.OK).json(result)
    }
}

exports.download = async function (req, res) {
    const domain = req.params.domain
    const type = req.params.entitytype
    const dateTimeFrom = req.params.datetimefrom
    const dateTimeTo = req.params.datetimeto
    const limitFrom = req.params.limitfrom
    const limitTo = req.params.limitto

    connect(function (dbo) {
        dbo.collection(domain).find({'type': type}).toArray(function (err, result) {
            send(res, err, result)
        })
    })
}

exports.entitytypes = async function (req, res) {
    const domain = req.params.domain
    connect(function (dbo) {
        dbo.collection(domain).distinct('type', function (err, result) {
            send(res, err, result)
        })
    })
}