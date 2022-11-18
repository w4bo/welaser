@file:JvmName("WriteToMongo")

package it.unibo.writetomongo

import com.mongodb.client.MongoClients
import io.github.cdimascio.dotenv.Dotenv
import it.unibo.DOMAIN
import org.apache.kafka.clients.consumer.Consumer
import org.apache.kafka.clients.consumer.ConsumerConfig
import org.apache.kafka.clients.consumer.KafkaConsumer
import org.apache.kafka.common.serialization.StringDeserializer
import org.bson.Document
import org.json.JSONObject
import java.time.Duration
import java.util.*
import java.util.regex.Pattern

// NB: comments from the dotenv file will be loaded as strings as well! Be careful!
val dotenv: Dotenv = Dotenv.configure().directory("./.env").load()
const val GIVE_UP = 30

fun consumeFromKafka(group: String, consume: (JSONObject) -> Unit) {
    // configuring the kafka client
    val props = Properties()
    props[ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG] = "${dotenv["KAFKA_IP"]}:${dotenv["KAFKA_PORT_EXT"]}"
    props[ConsumerConfig.GROUP_ID_CONFIG] = group
    props[ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG] = StringDeserializer::class.java.name
    props[ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG] = StringDeserializer::class.java.name
    props[ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG] = "true"
    props[ConsumerConfig.AUTO_COMMIT_INTERVAL_MS_CONFIG] = "1000"
    props[ConsumerConfig.AUTO_OFFSET_RESET_CONFIG] = "earliest"
    props[ConsumerConfig.METADATA_MAX_AGE_CONFIG] = "1000"
    // create the kafka consumer
    val consumer: Consumer<Long, String> = KafkaConsumer(props)
    // listen to all topics beginning with the DRACO_RAW_TOPIC
    val pattern: Pattern = Pattern.compile("^${dotenv["DRACO_RAW_TOPIC"]}.*")
    consumer.subscribe(pattern)
    var messageReceived = false
    var retry = 0
    while (true) {
        // consume the messages
        val consumerRecords = consumer.poll(Duration.ofMillis(1000))
        // if no message is received...
        if (!messageReceived && consumerRecords.count() == 0) {
            println("No message found: $retry")
            // increase the number of retry, and if above threshold exit the loop
            if (++retry > GIVE_UP) break
        } else {
            // at least a message has been received
            messageReceived = true
            // iterate over the received messages
            consumerRecords.forEach { record ->
                // println("Consumer Record:(%d, %s, %d, %d)\n" + record.key() + record.value() + record.partition() + record.offset())
                val data = JSONObject(record.value())
                // add the kafka timestamp
                data.put("timestamp_kafka", System.currentTimeMillis())
                // write to mongo
                consume(data)
            }
        }
    }
    // stop the consumer
    consumer.close()
}

fun main() {
    // create a mongodb client
    val mongoClient = MongoClients.create("mongodb://${dotenv["MONGO_DB_PERS_IP"]}:${dotenv["MONGO_DB_PERS_PORT_EXT"]}")
    consumeFromKafka("writetomongo") { data ->
        mongoClient
            .getDatabase(dotenv["MONGO_DB_PERS_DB"])
            .getCollection(data.getString(DOMAIN))
            .insertOne(Document.parse(data.toString()))
    }
}
