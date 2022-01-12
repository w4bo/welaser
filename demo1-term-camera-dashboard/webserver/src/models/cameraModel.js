module.exports = function(mongoose) {
	var Schema = mongoose.Schema
	var CameraSchema = new mongoose.Schema({
    id: {
      type: String,
      required: true
    },
    image: {
      type: String
    },
		isOn: {
      type: Boolean
    },
    time: {
      type: Number
    }
	})
	return mongoose.model('cameramodel', CameraSchema, 'Camera');
}
