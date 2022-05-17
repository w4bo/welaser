package it.unibo.devices
import io.github.cdimascio.dotenv.Dotenv
import org.apache.commons.io.IOUtils
import org.apache.kafka.clients.producer.KafkaProducer
import org.apache.kafka.clients.producer.ProducerRecord
import org.eclipse.paho.client.mqttv3.IMqttClient
import org.eclipse.paho.client.mqttv3.MqttClient
import org.eclipse.paho.client.mqttv3.MqttConnectOptions
import org.eclipse.paho.client.mqttv3.MqttMessage
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence
import org.json.JSONObject
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.util.*
import kotlin.random.Random

// NB: comments from the dotenv file will be loaded as strings as well! Be careful!
val dotenv: Dotenv = Dotenv.configure().directory("../.env").load()
val DRACO_IP = dotenv["DRACO_IP"]
val DRACO_PORT_EXT = dotenv["DRACO_PORT_EXT"]
val ORION_IP = dotenv["ORION_IP"]
val ORION_PORT_EXT = dotenv["ORION_PORT_EXT"]
val ORION_URL = "http://${ORION_IP}:${ORION_PORT_EXT}"
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
enum class EntityType { Camera, Thermometer, Dummy }

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
        val inputstream = Camera::class.java.getResourceAsStream("/img0" + Random.nextInt(1, 4) + ".png")
        val fileContent: ByteArray = IOUtils.toByteArray(inputstream)
        // val inputFile = File(javaClass.classLoader.getResource("img0" + Random.nextInt(1, 4) + ".png").file)
        // val fileContent: ByteArray = FileUtils.readFileToByteArray(inputFile)
        return Base64.getEncoder().encodeToString(fileContent)
    }
}

/** A dummy sensor */
class DummySensor : ISensor {
    override fun getType(): EntityType = EntityType.Dummy
    override fun sense() = "foo"
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
    fun exec(commandName: String, payload: String)
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
    fun listen(topic: String = "", f: (commandName: String, payload: String) -> Unit = { _, _ -> })
}

enum class REQUEST_TYPE {GET, POST, PUT, DELETE, PATCH}

fun httpRequest(url: String, payload: String? = null, headers: Collection<Pair<String, String>> = listOf(), requestType: REQUEST_TYPE = REQUEST_TYPE.GET, retry: Int = 3): String {
    try {
        val client = HttpClient.newBuilder().build()
        var requestBuilder = HttpRequest.newBuilder().uri(URI.create(url))
        if (payload != null) {
            requestBuilder =
                when(requestType) {
                    REQUEST_TYPE.PUT -> requestBuilder.PUT(HttpRequest.BodyPublishers.ofString(payload))
                    REQUEST_TYPE.PATCH -> requestBuilder.method("PATCH", HttpRequest.BodyPublishers.ofString(payload))
                    else -> requestBuilder.POST(HttpRequest.BodyPublishers.ofString(payload))
                }
        } else {
            requestBuilder =
                when(requestType) {
                    REQUEST_TYPE.DELETE -> requestBuilder.DELETE()
                    else -> requestBuilder.GET()
                }
        }
        headers.forEach {
            requestBuilder = requestBuilder.header(it.first, it.second)
        }
        val response = client.send(requestBuilder.build(), HttpResponse.BodyHandlers.ofString());
        if (response.body().contains("error")) {
            if (response.body().contains("Already Exists")) {
                httpRequest(url.replace("entities", "entities/" + JSONObject(payload!!).getString("id")), requestType = REQUEST_TYPE.DELETE, retry = retry)
                httpRequest(url, payload, headers, requestType, retry)
            } else {
                throw IllegalArgumentException(response.body())
            }
        }
        return response.body()!!
    } catch (e: Exception) {
        if (retry <= 0) {
            e.printStackTrace()
            throw IllegalArgumentException(e.message)
        } else {
            Thread.sleep(100L * retry)
            return httpRequest(url, payload, headers, requestType, retry - 1)
        }
    }
}

class ProtocolMQTT : IProtocol {
    var client: IMqttClient = MqttClient("tcp://$MOSQUITTO_IP:$MOSQUITTO_PORT_EXT", UUID.randomUUID().toString(), MemoryPersistence())
    val connOpts = MqttConnectOptions()

    override fun register(s: String) {
        connOpts.isCleanSession = true
        connOpts.userName = MOSQUITTO_USER
        connOpts.password = MOSQUITTO_PWD.toCharArray()
        client.connect(connOpts)
        while (!client.isConnected) {
            println("Waiting for client connection")
            Thread.sleep(100)
        }
        httpRequest("http://${IOTA_IP}:${IOTA_NORTH_PORT}/iot/devices", s, listOf(Pair("Content-Type", "application/json"), Pair("fiware-service", FIWARE_SERVICE), Pair("fiware-servicepath", FIWARE_SERVICEPATH)))
    }

    override fun send(payload: String, topic: String) {
        client.publish(topic, payload.toByteArray(), 0, false)
    }

    override fun listen(topic: String, f: (commandName: String, payload: String) -> Unit) {
        client.subscribe(topic) { _, message ->
            val o = JSONObject(String(message!!.payload))
            val commandName = o.keys().next()!!
            f(commandName, o.getString(commandName))
            client.publish(topic + "exe", MqttMessage("OK".toByteArray()))
        }
    }
}

class ProtocolSubscription : IProtocol {
    override fun register(s: String) {}

    override fun send(payload: String, topic: String) {
        httpRequest("http://${DRACO_IP}:${DRACO_PORT_EXT}/", payload, listOf(Pair("Content-Type", "application/json")))
    }

    override fun listen(topic: String, f: (commandName: String, payload: String) -> Unit) {}
}

class ProtocolHTTP : IProtocol {

    override fun register(s: String) {
        httpRequest("${ORION_URL}/v2/entities?options=keyValues", s, listOf(Pair("Content-Type", "application/json")))
    }

    override fun send(s: String, topic: String) {
        httpRequest("${ORION_URL}/v2/op/update?options=keyValues", s, listOf(Pair("Content-Type", "application/json")))
    }

    override fun listen(topic: String, f: (commandName: String, payload: String) -> Unit) {}
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

    override fun listen(topic: String, f: (commandName: String, payload: String) -> Unit) {}
}

abstract class Device(
    open var status: Boolean,
    val timeoutMs: Int,
    open val moving: Boolean,
    var latitude: Double,
    var longitude: Double,
    val domain: String,
    val mission: String,
    open val s: ISensor,
    val p: IProtocol,
    val times: Int = 1000
) : ISensor by s, IActuator, IProtocol by p {
    open val id: String = "" + getId()
    open val sendTopic: String = ""
    open val listenTopic: String = ""
    open val listenCallback: (commandName: String, payload: String) -> Unit = { _, _ -> }
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

    /**
     * Execute a command
     */
    override fun exec(commandName: String, payload: String) {
        // println(commandName)
        status = commandName == "on"
    }

    /**
     * Update the position of the device
     */
    open fun updatePosition() {
        if (moving) {
            latitude += (r.nextDouble() - 0.5) / 100000
            longitude += (r.nextDouble() - 0.5) / 100000
        }
    }

    /**
     * Control loop
     */
    fun run() {
        register(getRegister())
        // println("Listening to... $listenTopic")
        listen(listenTopic, listenCallback)
        var i = 0
        // println(status)
        while (i++ < times) {
            // print("Iterating...")
            Thread.sleep(timeoutMs.toLong())
            if (status) {
                val s = sense()
                // println(id + " " + s)
                send(s, sendTopic)
                updatePosition()
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
                "${if (getType() == EntityType.Camera) "Image" else "Temperature"}": {"value": "${s.sense()}",                "type": "String"},
                "Status":                                                            {"value": $status,                       "type": "Boolean"},
                "Time":                                                              {"value": ${System.currentTimeMillis()}, "type": "Integer"},
                "Latitude":                                                          {"value": $latitude,                     "type": "Float"},
                "Location":                                                          {"value": "foo",                         "type": "String"},
                "Longitude":                                                         {"value": $longitude,                    "type": "Float"},
                "Mission":                                                           {"value": "$mission",                    "type": "String"},
                "Domain":                                                            {"value": "$domain",                     "type": "String"}
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
//        return """{
//                "id": "urn:ngsi-ld:$id",
//                "type": "OCB-${getType()}",
//                "${if (getType() == EntityType.Camera) "Image" else "Temperature"}": {"value": "${s.sense()}",                "type": "String"},
//                "Status":                                                            {"value": $status,                       "type": "Boolean"},
//                "Time":                                                              {"value": ${System.currentTimeMillis()}, "type": "Integer"},
//                "Latitude":                                                          {"value": $latitude,                     "type": "Float"},
//                "Longitude":                                                         {"value": $longitude,                    "type": "Float"},
//                "Mission":                                                           {"value": "$mission",                    "type": "String"},
//                "Domain":                                                            {"value": "$domain",                     "type": "String"}
//            }""".replace("\\s+".toRegex(), " ")
        return """{
                "id": "urn:ngsi-ld:$id",
                "type": "OCB-${getType()}",
                "${if (getType() == EntityType.Camera) "Image" else "Temperature"}": "${s.sense()}",               
                "Status":                                                            $status,                      
                "Time":                                                              ${System.currentTimeMillis()},
                "Latitude":                                                          $latitude,                    
                "Longitude":                                                         $longitude,                   
                "Mission":                                                           "$mission",                    
                "Domain":                                                            "$domain"               
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
    override val listenCallback: (commandName: String, payload: String) -> Unit = { c, p ->
        exec(c, p)
    }
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