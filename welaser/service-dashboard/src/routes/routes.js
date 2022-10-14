const entityController = require('../controllers/entityController');
module.exports = function (app) {
    app.route('/api/download/:domain/:type/:datetimefrom/:datetimeto/:limitfrom/:limitto').get(entityController.download)
    // app.route('/api/statistics').get(entityController.getAll)
    app.use(function (req, res) {
        res.sendFile(appRoot + '/www/index.html');
    })
}
