module.exports = function (mongoose) {
    const EntitySchema = new mongoose.Schema({ any: {} })
    return mongoose.model('model_statistics', EntitySchema, 'mission_dummy');
}
