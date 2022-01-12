//questo file collega gli indirizzi con i metodi del controller
module.exports = function(app) {
  const debugController = require('../controllers/debugController')
  const thermometerController = require("../controllers/thermometerController")
  const cameraController = require("../controllers/cameraController")


  app.route('/api/fiware/notifytest').post(debugController.handleNotifyTest)
  app.route("/api/test").get(debugController.test)
  /**
   * API used by fiware
   */
  app.route("/api/fiware/notification/thermometer").post(thermometerController.notification)
  app.route("/api/fiware/notification/camera").post(cameraController.notification)

  /**
   * DEVICE API
   */

  /*THERMOMETER*/
  app.route("/api/data/thermometer")
    .get(thermometerController.getAll)
  app.route("/api/data/thermometer/:thermid/off")
    .patch(thermometerController.turnOff)
  app.route("/api/data/thermometer/:thermid/on")
    .patch(thermometerController.turnOn)


  /*CAMERA*/
  app.route("/api/data/camera")
    .get(cameraController.getAll)
  app.route("/api/data/camera/:cameraid/off")
    .patch(cameraController.turnOff)
  app.route("/api/data/camera/:cameraid/on")
    .patch(cameraController.turnOn)

	app.use(function(req, res) {
    res.sendFile(appRoot  + '/www/index.html');
  })
}
