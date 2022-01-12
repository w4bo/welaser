const topicController = require("../controllers/topicController");
const entityController = require("../controllers/entityController");
module.exports = function (app) {
    app.route("/api/statistics").get(entityController.getAll)
    app.route("/api/statistics/:mission").get(entityController.getAll)
    app.route("/api/topic").get(topicController.getAll)
    app.route("/api/topic/:kind").get(topicController.getKind)

    app.use(function (req, res) {
        res.sendFile(appRoot + '/www/index.html');
    })
}
