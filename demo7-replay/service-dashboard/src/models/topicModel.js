module.exports = function (mongoose) {
    const TopicSchema = new mongoose.Schema({
        id: {
            type: String,
            required: true
        },
        topic: {
            type: String
        },
        kind: {
            type: String
        }
    })
    return mongoose.model('model_topics', TopicSchema, 'service_topic');
}
