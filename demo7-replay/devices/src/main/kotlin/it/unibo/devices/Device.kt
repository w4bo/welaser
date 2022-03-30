package it.unibo.devices
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.fasterxml.jackson.module.kotlin.registerKotlinModule
import io.github.cdimascio.dotenv.Dotenv
import org.apache.commons.io.FileUtils
import org.apache.kafka.clients.producer.KafkaProducer
import org.apache.kafka.clients.producer.ProducerRecord
import org.eclipse.paho.client.mqttv3.IMqttClient
import org.eclipse.paho.client.mqttv3.MqttClient
import org.eclipse.paho.client.mqttv3.MqttConnectOptions
import org.eclipse.paho.client.mqttv3.MqttMessage
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence
import java.io.File
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.util.*
import java.util.Map
import kotlin.random.Random

// Get some costants. NB: comments from the dotenv file will be loaded as strings as well! Be careful!
val dotenv: Dotenv = Dotenv.configure().directory("../.env").load()
val DRACO_IP = dotenv["DRACO_IP"]
val DRACO_PORT_EXT = dotenv["DRACO_PORT_EXT"]
val ORION_IP = dotenv["ORION_IP"]
val ORION_PORT_EXT = dotenv["ORION_PORT_EXT"]
val IOTA_IP = dotenv["IOTA_IP"]
val IOTA_NORTH_PORT = dotenv["IOTA_NORTH_PORT"]
val FIWARE_SERVICE = dotenv["FIWARE_SERVICE"]
val FIWARE_SERVICEPATH = dotenv["FIWARE_SERVICEPATH"]
val FIWARE_API_KEY = dotenv["FIWARE_API_KEY"]
val MOSQUITTO_USER = dotenv["MOSQUITTO_USER"]
val MOSQUITTO_PWD = dotenv["MOSQUITTO_PWD"]
val MOSQUITTO_IP = dotenv["MOSQUITTO_IP"]
val MOSQUITTO_PORT_EXT = dotenv["MOSQUITTO_PORT_EXT"]

/**
 * Some entity types
 */
enum class EntityType { Camera, Thermometer }

/**
 * Any thing
 */
interface IThing {
    /**
     * @return get the type of the thing
     */
    fun getType(): EntityType
}

/**
 * A sensor
 */
interface ISensor : IThing {
    /**
     * @return the sensed value as string
     */
    fun sense(): String
}

/**
 * A camera
 */
class Camera : ISensor {
    override fun getType(): EntityType = EntityType.Camera

    /**
     * @return get an image from src/main/resources, the image is encoded in Base64
     */
    override fun sense(): String {
        val inputFile = File(javaClass.classLoader.getResource("img0" + Random.nextInt(1, 4) + ".png").file)
        val fileContent: ByteArray = FileUtils.readFileToByteArray(inputFile)
        return Base64.getEncoder().encodeToString(fileContent)
    }
}

/**
 * A thermometer
 */
class Thermometer : ISensor {
    override fun getType(): EntityType = EntityType.Thermometer

    /**
     * @return a random temperature value
     */
    override fun sense(): String {
        return "" + Random.nextInt(10, 30)
    }
}

/**
 * An actuator
 */
interface IActuator : IThing {
    /**
     * Execute a command
     * @param m given parameters
     */
    fun exec(m: Map<String, String>)
}

/**
 * A generic communication protocol
 */
interface IProtocol {
    /**
     * Register the client
     * @param payload if needed
     */
    fun register(s: String)

    /**
     * Send a message
     * @param payload payload of the message
     * @param topic send the message to the current topic, if any
     */
    fun send(payload: String, topic: String = "")

    /**
     * Register a callback
     * @param topic listen to the current topic, if any
     * @param f callback function
     */
    fun listen(topic: String = "", f: (m: Map<String, String>) -> Unit = { })
}

class ProtocolMQTT : IProtocol {
    val publisherId = UUID.randomUUID().toString()
    var client: IMqttClient = MqttClient("tcp://$MOSQUITTO_IP:$MOSQUITTO_PORT_EXT", publisherId, MemoryPersistence())
    val connOpts = MqttConnectOptions()

    override fun register(s: String) {
        connOpts.isCleanSession = true
        connOpts.userName = MOSQUITTO_USER
        connOpts.password = MOSQUITTO_PWD.toCharArray()
        client.connect(connOpts)
        val client = HttpClient.newBuilder().build();
        val request =
            HttpRequest.newBuilder()
                .uri(URI.create("http://${IOTA_IP}:${IOTA_NORTH_PORT}/iot/devices"))
                .POST(HttpRequest.BodyPublishers.ofString(s))
                .header("Content-Type", "application/json")
                .header("fiware-service", FIWARE_SERVICE)
                .header("fiware-servicepath", FIWARE_SERVICEPATH)
                .build()
        val response = client.send(request, HttpResponse.BodyHandlers.ofString());
        // println(response.body())
    }

    override fun send(payload: String, topic: String) {
        // println(payload)
        client.publish(topic, payload.toByteArray(), 0, false)
    }

    override fun listen(topic: String, f: (m: Map<String, String>) -> Unit) {
        client.subscribe(topic) { _, message ->
            val payload: ByteArray = message!!.payload
            val mapper = ObjectMapper().registerKotlinModule()
            f(mapper.readValue(payload))
            client.publish(topic + "exe", MqttMessage(payload))
        }
    }
}

class ProtocolSubscription : IProtocol {
    val client = HttpClient.newBuilder().build()
    val address = "http://${DRACO_IP}:${DRACO_PORT_EXT}/"
    override fun register(s: String) {}

    override fun send(payload: String, topic: String) {
        // println(payload)
        val request =
            HttpRequest.newBuilder()
                .uri(URI.create(address))
                .POST(HttpRequest.BodyPublishers.ofString(payload))
                .header("Content-Type", "application/json")
                .build()
        val response = client.send(request, HttpResponse.BodyHandlers.ofString());
        // println(response.body())
    }

    override fun listen(topic: String, f: (m: Map<String, String>) -> Unit) {}
}

class ProtocolHTTP : IProtocol {
    val client = HttpClient.newBuilder().build()

    override fun register(s: String) {
        val request =
            HttpRequest.newBuilder()
                .uri(URI.create("http://${ORION_IP}:${ORION_PORT_EXT}/v2/entities"))
                .POST(HttpRequest.BodyPublishers.ofString(s))
                .header("Content-Type", "application/json")
                .build()
        val response = client.send(request, HttpResponse.BodyHandlers.ofString());
        // println(response.body())
    }

    override fun send(payload: String, topic: String) {
        // println(payload)
        val request =
            HttpRequest.newBuilder()
                .uri(URI.create("http://${ORION_IP}:${ORION_PORT_EXT}/v2/op/update"))
                .POST(HttpRequest.BodyPublishers.ofString(payload))
                .header("Content-Type", "application/json")
                .build()
        val response = client.send(request, HttpResponse.BodyHandlers.ofString());
        // println(response.body())
    }

    override fun listen(topic: String, f: (m: Map<String, String>) -> Unit) {}
}

class ProtocolKafka : IProtocol {
    val props = Properties()
    var producer: KafkaProducer<String, String>? = null
    override fun register(s: String) {
        props["bootstrap.servers"] = "localhost:9092"
        props["acks"] = "all"
        props["retries"] = 0
        props["linger.ms"] = 1
        props["key.serializer"] = "org.apache.kafka.common.serialization.StringSerializer"
        props["value.serializer"] = "org.apache.kafka.common.serialization.StringSerializer"
        producer = KafkaProducer(props)
    }

    override fun send(payload: String, topic: String) {
        producer!!.send(ProducerRecord("data.canary.realtime", "foo", payload))
    }

    override fun listen(topic: String, f: (m: Map<String, String>) -> Unit) {}
}

abstract class Device(
    var status: Boolean,
    val timeoutMs: Int,
    val moving: Boolean,
    var latitude: Double,
    var longitude: Double,
    val domain: String,
    val mission: String,
    val s: ISensor,
    val p: IProtocol,
    val times: Int = 1000
) : ISensor by s, IActuator, IProtocol by p {
    open val id: String = "" + getId()
    open val sendTopic: String = ""
    open val listenTopic: String = ""
    open val listenCallback: (m: Map<String, String>) -> Unit = {}
    val r = Random(3)
    abstract fun getStatus(): String
    open fun getRegister(): String = getStatus()
    override fun getType(): EntityType = s.getType()

    companion object {
        @JvmName("getId1")
        fun getId(): Int {
            return (Math.random() * 1000000).toInt()
        }
    }

    override fun exec(m: Map<String, String>) {
        status = m.entrySet().first().key == "on"
    }

    fun run() {
        register(getRegister())
        listen(listenTopic, listenCallback)
        var i = 0
        while (i++ < times) {
            Thread.sleep(timeoutMs.toLong())
            if (status) {
                val s = sense()
                // println(s)
                send(s, sendTopic)
            }
            if (moving) {
                latitude += (r.nextDouble() - 0.5) / 100000
                longitude += (r.nextDouble() - 0.5) / 100000
            }
        }
    }
}

class DeviceSubscription(
    status: Boolean,
    timeoutMs: Int,
    moving: Boolean,
    latitude: Double,
    longitude: Double,
    domain: String,
    mission: String,
    s: ISensor,
    p: IProtocol
) : Device(status, timeoutMs, moving, latitude, longitude, domain, mission, s, p) {
    override fun getStatus(): String {
        return """{"data": [{
                "id": "urn:ngsi-ld:$id",
                "type": "Sub-${getType()}",
                "${if (getType() == EntityType.Camera) "Image" else "Temperature"}":    {"value": "${s.sense()}",                   "type": "String"},
                "Status":                                                               {"value": $status,                          "type": "Boolean"},
                "Time":                                                                 {"value": ${System.currentTimeMillis()},    "type": "Integer"},
                "Latitude":                                                             {"value": $latitude,                        "type": "Float"},
                "Location":                                                             {"value": "foo",                            "type": "String"},
                "Longitude":                                                            {"value": $longitude,                       "type": "Float"},
                "Mission":                                                              {"value": "$mission",                       "type": "String"},
                "Domain":                                                               {"value": "$domain",                        "type": "String"}
            }]}""".replace("\\s+".toRegex(), " ")
    }

    override fun sense(): String = getStatus()
}

open class DeviceFIWARE(
    status: Boolean,
    timeoutMs: Int,
    moving: Boolean,
    latitude: Double,
    longitude: Double,
    domain: String,
    mission: String,
    s: ISensor,
    p: IProtocol
) : Device(status, timeoutMs, moving, latitude, longitude, domain, mission, s, p) {
    override fun getStatus(): String {
        return """{
                "id": "urn:ngsi-ld:$id",
                "type": "OCB-${getType()}",
                "${if (getType() == EntityType.Camera) "Image" else "Temperature"}":    {"value": "${s.sense()}",                   "type": "String"},
                "Status":                                                               {"value": $status,                          "type": "Boolean"},
                "Time":                                                                 {"value": ${System.currentTimeMillis()},    "type": "Integer"},
                "Latitude":                                                             {"value": $latitude,                        "type": "Float"},
                "Longitude":                                                            {"value": $longitude,                       "type": "Float"},
                "Mission":                                                              {"value": "$mission",                       "type": "String"},
                "Domain":                                                               {"value": "$domain",                        "type": "String"}
            }""".replace("\\s+".toRegex(), " ")
    }

    override fun sense(): String {
        return """{"actionType": "update", "entities": [${getStatus()}]}""".replace("\\s+".toRegex(), " ")
    }
}

class DeviceKafka(
    status: Boolean,
    timeoutMs: Int,
    moving: Boolean,
    latitude: Double,
    longitude: Double,
    domain: String,
    mission: String,
    s: ISensor,
    p: IProtocol
) : DeviceFIWARE(status, timeoutMs, moving, latitude, longitude, domain, mission, s, p) {
    override fun sense(): String = getStatus().replace("OCB", "KAFKA")
}

class DeviceMQTT(
    status: Boolean,
    timeoutMs: Int,
    moving: Boolean,
    latitude: Double,
    longitude: Double,
    domain: String,
    mission: String,
    s: ISensor,
    p: IProtocol
) : Device(status, timeoutMs, moving, latitude, longitude, domain, mission, s, p) {
    override val id = getType().toString() + getId()
    override val sendTopic = "/$FIWARE_API_KEY/$id/attrs"
    override val listenTopic: String = "/$FIWARE_API_KEY/$id/cmd"
    override val listenCallback: (m: Map<String, String>) -> Unit = { m -> exec(m) }
    override fun getRegister(): String {
        return """{
                "devices": 
                    [{
                        "device_id": "$id",
                        "entity_name": "urn:ngsi-ld:$id",
                        "entity_type": "${getType()}",
                        "transport": "MQTT",
                        "commands": [
                            {"name": "on", "type": "command"},
                            {"name": "off", "type": "command"}
                        ],
                        "attributes": [
                            {"object_id": "${if (getType() == EntityType.Camera) "img" else "temp"}", "name": "${if (getType() == EntityType.Camera) "Image" else "Temperature"}", "type": "String"},
                            {"object_id": "stat",  "name": "Status",       "type": "Boolean"},
                            {"object_id": "time",  "name": "Time",         "type": "Integer"},
                            {"object_id": "lat",   "name": "Latitude",     "type": "Float"},
                            {"object_id": "lon",   "name": "Longitude",    "type": "Float"},
                            {"object_id": "where", "name": "Location",     "type": "String"}
                        ],
                        "static_attributes": [
                            {"name": "Mission", "type": "String", "value": "$mission"},
                            {"name": "Domain", "type": "String", "value": "$domain"}
                        ]
                    }]
                }""".replace("\\s+".toRegex(), " ")
    }

    override fun getStatus(): String {
        return """{
                "${if (getType() == EntityType.Camera) "img" else "temp"}": "${s.sense()}",
                "stat": $status,
                "time": ${System.currentTimeMillis()},
                "lat": ${latitude},
                "lon": ${longitude}
            }""".replace("\\s+".toRegex(), " ")
    }

    override fun sense(): String {
        return getStatus()
    }
}