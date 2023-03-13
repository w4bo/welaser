const entityController = require('../controllers/entityController');
module.exports = function (app) {
    app.route('/api/download/:domain/:entitytype/:datetimefrom/:datetimeto/:skip/:limit').get(entityController.downloadTypeFromdateTodateSkipLimit)
    app.route('/api/download/:domain/:datetimefrom/:datetimeto/:skip/:limit').get(entityController.downloadFromdateTodateSkipLimit)
    app.route('/api/download/stats/:domain/:datetimefrom/:datetimeto/:timestep').get(entityController.downloadStatsFromTo)
    app.route('/api/download/count/:domain/:datetimefrom/:datetimeto').get(entityController.downloadCountFromTo)
    app.route('/api/download/distinct/:domain/:datetimefrom/:datetimeto').get(entityController.downloadDistinctFromTo)
    app.route('/api/entitytypes/:domain').get(entityController.entitytypes)
    app.route('/api/entities/:domain').get(entityController.entities)
    app.route('/api/entities/:domain/:id').get(entityController.historicEntities)
    app.route('/api/entity/:domain/:id').get(entityController.entity)
    app.use(function (req, res) {
        res.sendFile(appRoot + '/www/index.html')
    })
}
