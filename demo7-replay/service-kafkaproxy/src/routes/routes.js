module.exports = function(app) {
  const proxyController = require("../controllers/proxyController")

  app.route("/api/register/:topic").get(proxyController.registerTopic)

}
