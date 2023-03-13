const MongoClient = require('mongodb').MongoClient
const HttpStatus = require('http-status-codes')
const env = require('dotenv')
env.config() // load the environment variables
const url = 'mongodb://' + process.env.MONGO_DB_PERS_IP + ':' + process.env.MONGO_DB_PERS_PORT_EXT

function connect(next) {
    MongoClient.connect(url, async function (err, db) {
        if (err) throw err
        const dbo = db.db(process.env.MONGO_DB_PERS_DB)
        await next(dbo)
        // await db.close()
    })
}

function send(res, err, result) {
    if (err) {
        res.send(err)
    } else {
        res.status(HttpStatus.OK).json(result)
    }
}

/**
 * Given a domain (i.e., collection), download the distinct ids of the entities within the selected time interval
 */
exports.downloadDistinctFromTo = async function (req, res) {
    connect(function (dbo) {
        dbo
            .collection(req.params.domain)
            .distinct("id", {
                'timestamp_subscription': {
                    '$gte': parseInt(req.params.datetimefrom),
                    '$lte': parseInt(req.params.datetimeto)
                }
            }, function (err, result) {
                send(res, err, result.sort())
            })
    })
}

/**
 * Given a domain (i.e., collection), count all the entities within the selected time interval
 */
exports.downloadCountFromTo = async function (req, res) {
    connect(async function (dbo) {
        await dbo
            .collection(req.params.domain)
            .count({
                'timestamp_subscription': {
                    '$gte': parseInt(req.params.datetimefrom),
                    '$lte': parseInt(req.params.datetimeto)
                }
            }, function (err, result) {
                send(res, err, result.sort())
            })
    })
}

/**
 * Given a domain (i.e., collection), count all the entities within the selected time interval
 */
exports.downloadStatsFromTo = async function (req, res) {
    const pipeline = [
        {
            $match: {
                'timestamp': {
                    '$gte': parseInt(req.params.datetimefrom),
                    '$lte': parseInt(req.params.datetimeto)
                }
            }
        },
        { $group: { "_id": { "$multiply": [{ "$round": [{ "$divide": ["$timestamp", 1000 * req.params.timestep] }, 0] }, 1000 * req.params.timestep] }, count: { $sum: 1 }, avg_delay_ocb: { $avg: { $subtract: ['$timestamp_subscription', '$timestamp'] } }, avg_delay_kafka: { $avg: { $subtract: ['$timestamp_kafka', '$timestamp'] } } } }
    ];
    connect(async function (dbo) {
        await dbo
            .collection(req.params.domain)
            .aggregate(pipeline)
            .toArray(function (err, data) {
                send(res, err, data)
            })
    })
}

/**
 * Given a domain (i.e., collection), download all the entities within the selected time interval
 */
exports.downloadFromdateTodateSkipLimit = async function (req, res) {
    connect(async function (dbo) {
        await dbo
            .collection(req.params.domain)
            .find({
                'timestamp_subscription': {
                    '$gte': parseInt(req.params.datetimefrom),
                    '$lte': parseInt(req.params.datetimeto)
                }
            })
            .sort({'timestamp_subscription': 1})
            .skip(parseInt(req.params.skip))
            .limit(parseInt(req.params.limit))
            .toArray(function (err, result) {
                send(res, err, result.sort())
            })
    })
}

/**
 * Given a domain (i.e., collection) and an entity type, download all the entities within the selected time interval
 */
exports.downloadTypeFromdateTodateSkipLimit = async function (req, res) {
    connect(function (dbo) {
        dbo
            .collection(req.params.domain)
            .find({
                'type': req.params.entitytype,
                'timestamp_subscription': {
                    '$gte': parseInt(req.params.datetimefrom),
                    '$lte': parseInt(req.params.datetimeto)
                }
            })
            .sort({'timestamp_subscription': 1})
            .skip(parseInt(req.params.skip))
            .limit(parseInt(req.params.limit))
            .toArray(function (err, result) {
                send(res, err, result.sort())
            })
    })
}

/**
 * Return the entity with a given id
 */
exports.entity = async function (req, res) {
    const domain = req.params.domain
    const id = req.params.id
    connect(function (dbo) {
        dbo.collection(domain).findOne({"id": id}, {fields: {"_id": 0}}, function (err, result) {
            send(res, err, result)
        })
    })
}

/**
 * Return the entity with a given id
 */
exports.historicEntities = async function (req, res) {
    const domain = req.params.domain
    const id = req.params.id
    connect(function (dbo) {
        dbo.collection(domain).find({"id": id}, {fields: {"_id": 0}}).toArray(function (err, result) {
            send(res, err, result)
        })
    })
}

/**
 * Return the distinct entity types from the given domain
 */
exports.entitytypes = async function (req, res) {
    const domain = req.params.domain
    connect(function (dbo) {
        dbo.collection(domain).distinct('type', function (err, result) {
            send(res, err, result.sort())
        })
    })
}

/**
 * Return all the entities from the given domain
 */
exports.entities = async function (req, res) {
    const domain = req.params.domain
    connect(function (dbo) {
        dbo.collection(domain)
            .aggregate([{"$group": { "_id": { name: "$name", id: "$id" } } }])
            .toArray(function (err, result) {
                const data = []
                for (const item of result) {
                    const inner = item["_id"]
                    if (inner["name"]) {
                        // do nothing
                    } else {
                        inner["name"] = inner["id"]
                    }
                    data.push(inner)
                }
                send(res, err, data.sort((a, b) => (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0)))
            })
    })
}