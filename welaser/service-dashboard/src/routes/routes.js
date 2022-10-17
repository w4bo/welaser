const entityController = require('../controllers/entityController');
module.exports = function (app) {
    app.route('/api/download/:domain/:entitytype/:datetimefrom/:datetimeto/:limitfrom/:limitto').get(entityController.download)
    app.route('/api/entitytypes/:domain').get(entityController.entitytypes)
    app.route('/api/entities/:domain').get(entityController.entities)
    app.route('/api/entity/:domain/:id').get(entityController.entity)
    // app.route('/api/statistics').get(entityController.getAll)
    app.use(function (req, res) {
        res.sendFile(appRoot + '/www/index.html');
    })
}
