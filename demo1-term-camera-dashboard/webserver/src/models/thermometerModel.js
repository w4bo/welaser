module.exports = function(mongoose) {
	var Schema = mongoose.Schema
	var ThermometerSchema = new mongoose.Schema({
    id: {
      type: String,
      required: true
    },
		temperature: {
			type: Number,
		},
		isOn: {
      type: Boolean
    },
    time: {
      type: Number
    }
	})
	return mongoose.model('thermometrmodel', ThermometerSchema, 'Thermometer');
}
