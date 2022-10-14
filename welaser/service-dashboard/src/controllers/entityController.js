const MongoClient = require('mongodb').MongoClient
const HttpStatus = require('http-status-codes')
const env = require('dotenv')
env.config() // load the environment variables
const url = 'mongodb://' + process.env.MONGO_DB_PERS_IP + ':' + process.env.MONGO_DB_PERS_PORT_EXT

exports.download = async function (req, res) {
    console.log(process.env)
    const domain = req.params.domain
    const type = req.params.entityType
    const dateTimeFrom = req.params.datetimefrom
    const dateTimeTo = req.params.datetimeto
    const limitFrom = req.params.limitfrom
    const limitTo = req.params.limitto
    MongoClient.connect(url, function (err, db) {
        if (err) throw err
        const dbo = db.db(process.env.MONGO_DB_PERS_DB)
        dbo.collection(domain).find({'type': type}, function (err, result) {
            if (err) {
                res.send(err)
            } else {
                res.status(HttpStatus.OK).json(result)
            }
        })
    })
}