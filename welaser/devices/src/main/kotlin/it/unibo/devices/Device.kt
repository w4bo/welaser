package it.unibo.devices
import io.github.cdimascio.dotenv.Dotenv
import io.ktor.network.sockets.*
import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import mu.KotlinLogging
import org.apache.commons.io.IOUtils
import org.apache.kafka.clients.producer.KafkaProducer
import org.apache.kafka.clients.producer.ProducerRecord
import org.eclipse.paho.client.mqttv3.IMqttClient
import org.eclipse.paho.client.mqttv3.MqttClient
import org.eclipse.paho.client.mqttv3.MqttConnectOptions
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence
import org.json.JSONObject
import java.net.ServerSocket
import java.util.*
import kotlin.random.Random

// NB: comments from the dotenv file will be loaded as strings as well! Be careful!
val dotenv: Dotenv = Dotenv.configure().directory("./.env").load()
val DRACO_IP = dotenv["DRACO_IP"]
val DRACO_PORT_EXT = dotenv["DRACO_PORT_EXT"].toInt()
val ORION_IP = dotenv["ORION_IP"]
val ORION_PORT_EXT = dotenv["ORION_PORT_EXT"].toInt()
val ORION_URL = "http://${ORION_IP}:${ORION_PORT_EXT}"
val IOTA_IP = dotenv["IOTA_IP"]
val IOTA_NORTH_PORT = dotenv["IOTA_NORTH_PORT"].toInt()
val KAFKA_IP = dotenv["KAFKA_IP"]
val KAFKA_PORT_EXT = dotenv["KAFKA_PORT_EXT"].toInt()
val FIWARE_SERVICE = dotenv["FIWARE_SERVICE"]
val FIWARE_SERVICEPATH = dotenv["FIWARE_SERVICEPATH"]
val FIWARE_API_KEY = dotenv["FIWARE_API_KEY"]
val MOSQUITTO_USER = dotenv["MOSQUITTO_USER"]
val MOSQUITTO_PWD = dotenv["MOSQUITTO_PWD"]
val MOSQUITTO_IP = dotenv["MOSQUITTO_IP"]
val MOSQUITTO_PORT_EXT = dotenv["MOSQUITTO_PORT_EXT"].toInt()
val CONTENTTYPE = "Content-Type" to "application/json"
/**
 * Some entity types
 */
enum class EntityType { Camera, Thermometer, Dummy, Heartbeat }

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
class Camera(val onBoard: Boolean = true) : ISensor {
    override fun getType(): EntityType = EntityType.Camera

    /**
     * @return get an image from src/main/resources, the image is encoded in Base64
     */
    @Synchronized override fun sense(): String {
        val inputstream = Camera::class.java.getResourceAsStream(if (onBoard) { "/img0" } else { "/field0" } + Random.nextInt(1, 4) + ".png")
        return Base64.getEncoder().encodeToString(IOUtils.toByteArray(inputstream)).replace("=", "%3D")
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
class RandomSensor(val from: Int = 10, val to: Int = 30) : ISensor {
    override fun getType(): EntityType = EntityType.Thermometer

    /**
     * @return a random temperature value
     */
    override fun sense(): String {
        return "" + Random.nextInt(from, to)
    }
}

/**
 * A heartbeat
 */
class Heartbeat(val from: Int = 10, val to: Int = 30) : ISensor {
    override fun getType(): EntityType = EntityType.Heartbeat
    override fun sense(): String {
        return "live" // "" + System.currentTimeMillis()
    }
}

/**
 * An actuator
 */
interface IActuator : IThing {
    /**
     * Execute a command
     * @param commandName name of the command
     * @param payload payload of the command
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
    fun listen(topic: String = "", f: (commandName: String, payload: String) -> Unit = { _, _ -> }) {
        // Not all protocols require listeners/consumers
    }

    /**
     * Close the connection, if any
     */
    fun close() {
        // Not all protocols require a (to close) connection
    }
}

// enum class REQUEST_TYPE {GET, POST, PUT, DELETE, PATCH}

//@Synchronized fun httpRequest(url: String, payload: String? = null, headers: Collection<Pair<String, String>> = listOf(), requestType: REQUEST_TYPE = REQUEST_TYPE.GET, retry: Int = 3): String {
//    try {
//        val client: HttpClient = HttpClient.newBuilder().build()
//        var requestBuilder = HttpRequest.newBuilder().uri(URI.create(url))
//        if (payload != null) {
//            requestBuilder =
//                when(requestType) {
//                    REQUEST_TYPE.PUT -> requestBuilder.PUT(HttpRequest.BodyPublishers.ofString(payload))
//                    REQUEST_TYPE.PATCH -> requestBuilder.method("PATCH", HttpRequest.BodyPublishers.ofString(payload))
//                    else -> requestBuilder.POST(HttpRequest.BodyPublishers.ofString(payload))
//                }
//        } else {
//            requestBuilder =
//                when(requestType) {
//                    REQUEST_TYPE.DELETE -> requestBuilder.DELETE()
//                    else -> requestBuilder.GET()
//                }
//        }
//        headers.forEach {
//            requestBuilder = requestBuilder.header(it.first, it.second)
//        }
//        val response = client.send(requestBuilder.build(), HttpResponse.BodyHandlers.ofString());
//        if (response.body().contains("error")) {
//            if (response.body().contains("Already Exists")) {
//                httpRequest(url.replace("entities", "entities/" + JSONObject(payload!!).getString("id")), requestType = REQUEST_TYPE.DELETE, retry = retry)
//                httpRequest(url, payload, headers, requestType, retry)
//            } else {
//                throw IllegalArgumentException(url + "\n" + payload + "\n" + response.body())
//            }
//        }
//        return response.body()!!
//    } catch (e: Exception) {
//        if (retry <= 0) {
//            e.printStackTrace()
//            throw IllegalArgumentException(e.message)
//        } else {
//            Thread.sleep(100L * retry)
//            return httpRequest(url, payload, headers, requestType, retry - 1)
//        }
//    }
//}

class ProtocolMQTT : IProtocol {
    var client: IMqttClient = MqttClient("tcp://$MOSQUITTO_IP:$MOSQUITTO_PORT_EXT", UUID.randomUUID().toString(), MemoryPersistence())
    val connOpts = MqttConnectOptions()

    @Synchronized override fun register(s: String) {
        connOpts.isCleanSession = true
        connOpts.userName = MOSQUITTO_USER
        connOpts.password = MOSQUITTO_PWD.toCharArray()
        client.connect(connOpts)
        while (!client.isConnected) {
            // println("Waiting for client connection")
            Thread.sleep(100)
        }
        khttp.async.post("${ORION_URL}/v2/entities?options=keyValues", mapOf(CONTENTTYPE), data = s, onResponse = { /* connection.disconnect() */ })
        // khttp.async.post("${ORION_URL}/v2/entities?options=keyValues", mapOf(CONTENTTYPE), data = s, onResponse = {
        //     println(this.text)
        //     khttp.get("${ORION_URL}/v2/entities?id=" + JSONObject(s).getString("id"))
        // })
        // httpRequest("${ORION_URL}/v2/entities?options=keyValues", s, listOf(Pair("Content-Type", "application/json")))
        // httpRequest("${ORION_URL}/v2/entities/?id=" + JSONObject(s).getString("id"))
        // httpRequest("http://${IOTA_IP}:${IOTA_NORTH_PORT}/iot/devices", s, listOf(Pair("Content-Type", "application/json"), Pair("fiware-service", FIWARE_SERVICE), Pair("fiware-servicepath", FIWARE_SERVICEPATH)))
        // httpRequest("${ORION_URL}/v2/entities/?id=" + JSONObject(s).getJSONArray("devices").getJSONObject(0) .getString("entity_name"), null, listOf(Pair("fiware-service", FIWARE_SERVICE), Pair("fiware-servicepath", FIWARE_SERVICEPATH)))
    }

    @Synchronized override fun send(payload: String, topic: String) {
        client.publish(topic, payload.toByteArray(), 0, false)
    }

    @Synchronized override fun listen(topic: String, f: (commandName: String, payload: String) -> Unit) {
        client.subscribe(topic) { _, message ->
            val s = String(message!!.payload)
            JSONObject(s).getJSONArray("data").forEach {
                var o = JSONObject(it.toString())
                if (o.has("cmd") && o.get("cmd").toString().isNotEmpty()) {
                    o = o.getJSONObject("cmd")
                    val commandName = o.keys().next()!!
                    f(commandName, o.getJSONObject(commandName).toString())
                }
                // client.publish(topic + "exe", MqttMessage("OK".toByteArray()))
            }
        }
    }

    @Synchronized override fun close() {
        client.disconnectForcibly()
        client.close()
    }
}

class ProtocolSubscription : IProtocol {
    @Synchronized
    override fun register(s: String) {
        // It does not require an explicit registration to a server
    }

    @Synchronized
    override fun send(payload: String, topic: String) {
        khttp.async.post("http://${DRACO_IP}:${DRACO_PORT_EXT}/", mapOf(CONTENTTYPE), data = payload, onResponse = { /* connection.disconnect() */ })
        // httpRequest("http://${DRACO_IP}:${DRACO_PORT_EXT}/", payload, listOf(Pair("Content-Type", "application/json")))
    }
}

class ProtocolHTTP : IProtocol {
    @Synchronized
    override fun register(s: String) {
        JSONObject(s) // check if s is a valid json object
        var retry = 3
        while (retry-- >= 0) {
            try {
                khttp.async.post("${ORION_URL}/v2/entities?options=keyValues", mapOf(CONTENTTYPE), data = s, onResponse = { /* connection.disconnect() */ })
            } catch (e: Exception) {
                if (retry == 0) {
                    e.printStackTrace()
                    throw e
                } else {
                    Thread.sleep(1000)
                }
            }
        }
        // httpRequest("${ORION_URL}/v2/entities?options=keyValues", s, listOf(Pair("Content-Type", "application/json")))
        // httpRequest("${ORION_URL}/v2/entities/" + JSONObject(s).getString("id"))
    }

    @Synchronized
    override fun send(payload: String, topic: String) {
        val payloadJSON = JSONObject(payload)
        val id = payloadJSON.get("id")
        payloadJSON.remove("id")
        if (payloadJSON.has("type")) {
            payloadJSON.remove("type")
        }
        if (payloadJSON.has("cmd")) {
            payloadJSON.remove("cmd")
        }
        khttp.async.patch(
            "$ORION_URL/v2/entities/$id/attrs?options=keyValues",
            mapOf(CONTENTTYPE),
            data = payloadJSON.toString(),
            onResponse = { /* connection.disconnect() */ }
        )
        // httpRequest("$ORION_URL/v2/entities/$id/attrs?options=keyValues",payload.toString(),listOf(Pair("Content-Type", "application/json")),REQUEST_TYPE.PATCH )
        // httpRequest("${ORION_URL}/v2/op/update?options=keyValues", s, listOf(Pair("Content-Type", "application/json")))
    }
}

class ProtocolKafka : IProtocol {
    val props = Properties()
    var producer: KafkaProducer<String, String>? = null
    @Synchronized
    override fun register(s: String) {
        props["bootstrap.servers"] = "$KAFKA_IP:$KAFKA_PORT_EXT"
        props["acks"] = "all"
        props["retries"] = 0
        props["linger.ms"] = 1
        props["key.serializer"] = "org.apache.kafka.common.serialization.StringSerializer"
        props["value.serializer"] = "org.apache.kafka.common.serialization.StringSerializer"
        producer = KafkaProducer(props)
    }

    @Synchronized
    override fun send(payload: String, topic: String) {
        producer!!.send(ProducerRecord("data.canary.realtime", "foo", payload))
    }
}

enum class STATUS { ON, OFF }

abstract class Device(
    open var status: STATUS,
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
    open val id: String = getType().toString() + getId()
    open val sendTopic: String = ""
    open val listenTopic: String = ""
    open val listenCallback: (commandName: String, payload: String) -> Unit = { _, _ -> }
    val r = Random(3)
    abstract fun getStatus(): String
    open fun getRegister(): String = getStatus()
    final override fun getType(): EntityType = s.getType()
    private val logger = KotlinLogging.logger {}

    companion object {
        @JvmName("getId1")
        @Synchronized
        fun getId(): Int {
            return (Math.random() * 1000000).toInt()
        }
    }

    /**
     * Execute a command
     */
    override fun exec(commandName: String, payload: String) {
        // println("$commandName $payload")
        status = if (commandName == "on") STATUS.ON else STATUS.OFF
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

    var sensedValue: String = "foo"

    /**
     * Update sensor value
     */
    open fun updateSensor(): String {
        return when(status) {
            STATUS.ON -> {
                updatePosition()
                sensedValue = if (getType() == EntityType.Camera) { """"image"""" } else { """"temperature"""" } + """: "${s.sense()}""""
                sensedValue
            }
            else -> sensedValue
        }
    }

    /**
     * Control loop
     */
    fun run() {
        register(getRegister())
        // println("$id - registering")
        listen(listenTopic, listenCallback)
        // println("$id - listening to $listenTopic")
        var i = 0
        while (i++ < times) {
            // println("$id - iterating")
            Thread.sleep(timeoutMs.toLong())
            val payload = getStatus()
            // println("$id - $payload")
            send(payload, sendTopic)
        }
        close()
    }
}

class DeviceSubscription(
    status: STATUS,
    timeoutMs: Int,
    moving: Boolean,
    latitude: Double,
    longitude: Double,
    domain: String,
    mission: String,
    s: ISensor
) : Device(status, timeoutMs, moving, latitude, longitude, domain, mission, s, ProtocolSubscription()) {
    override fun getStatus(): String {
        return """{"data": [{
                "id":              "$id",
                "type":            "Sub-${getType()}",
                ${updateSensor()},
                "status":          "$status",                      
                "timestamp":       ${System.currentTimeMillis()},
                "latitude":        $latitude,                    
                "location":        "foo",                        
                "longitude":       $longitude,                   
                "mission":         "$mission",                   
                "domain":          "$domain",                    
            }]}""".replace("\\s+".toRegex(), " ")
    }
}

open class DeviceHTTP(
    status: STATUS,
    timeoutMs: Int,
    moving: Boolean,
    latitude: Double,
    longitude: Double,
    domain: String,
    mission: String,
    s: ISensor,
    p: IProtocol = ProtocolHTTP(),
    times: Int = 1000
) : Device(status, timeoutMs, moving, latitude, longitude, domain, mission, s, p, times) {
    var server: NettyApplicationEngine? = null

    fun getIpPort(): Pair<String, Int> {
        val socket = ServerSocket(0)
        val port = socket.localPort
        socket.close()
        return Pair(socket.inetAddress.toString(), port)
    }

    override fun register(s: String) {
        super.register(s)
        if (JSONObject(s).has("cmdList")) {
            val socket = getIpPort()
            server = embeddedServer(Netty, port = socket.second, host = "0.0.0.0") {
                routing {
                    get("/") {
                        call.respondText("")
                    }
                    post("/") {
                        JSONObject(call.receive<String>()).getJSONArray("data").forEach {
                            var o = JSONObject(it.toString())
                            if (o.has("cmd") && o.get("cmd").toString().isNotEmpty()) {
                                o = o.getJSONObject("cmd")
                                val commandName = o.keys().next()!!
                                exec(commandName, o.getJSONObject(commandName).toString())
                            }
                        }
                        call.respondText("")
                    }
                }
            }.start(wait = false)
            khttp.post("http://${ORION_IP}:${ORION_PORT_EXT}/v2/subscriptions", mapOf(CONTENTTYPE), data = """
                {
                    "description": "Notify the entity when it receives a command",
                    "subject": { "entities": [{ "id" : "$id" }], "condition": { "attrs": [ "cmd" ] }},
                    "notification": { "http": { "url": "http://${IOTA_IP}:${socket.second}" }, "attrsFormat" : "keyValues", "attrs" : ["cmd"] }
                }""".trimIndent()) // .connection.disconnect()
        }
    }

    override fun getStatus(): String {
        return """{
                "id":              "$id",
                "type":            "OCB-${getType()}",
                ${updateSensor()}, 
                "status":          "$status",                      
                "timestamp":       ${System.currentTimeMillis()},
                "latitude":        $latitude,                    
                "longitude":       $longitude,                   
                "mission":         "$mission",                    
                "domain":          "$domain",
                "cmdList":         ["on", "off"],
                "cmd":             ""               
            }""".replace("\\s+".toRegex(), " ")
    }
}

class DeviceKafka(
    status: STATUS,
    timeoutMs: Int,
    moving: Boolean,
    latitude: Double,
    longitude: Double,
    domain: String,
    mission: String,
    s: ISensor
) : DeviceHTTP(status, timeoutMs, moving, latitude, longitude, domain, mission, s, ProtocolKafka()) {
    override fun sense(): String = super.sense().replace("OCB", "KAFKA")
}

class DeviceMQTT(
    status: STATUS,
    timeoutMs: Int,
    moving: Boolean,
    latitude: Double,
    longitude: Double,
    domain: String,
    mission: String,
    s: ISensor,
    times: Int = 1000
) : Device(status, timeoutMs, moving, latitude, longitude, domain, mission, s, ProtocolMQTT(), times = times) {
    override val sendTopic = "/$FIWARE_API_KEY/$id/attrs"
    override val listenTopic: String = "/$FIWARE_API_KEY/$id/cmd"
    override val listenCallback: (commandName: String, payload: String) -> Unit = { c, p -> exec(c, p) }

    override fun getRegister(): String {
        return """{
                "id":              "$id",
                "type":            "MQTT-${getType()}",
                ${updateSensor()}, 
                "status":           "$status",                      
                "timestamp":        ${System.currentTimeMillis()},
                "latitude":         $latitude,                    
                "longitude":        $longitude,                   
                "mission":          "$mission",                    
                "domain":           "$domain",
                "cmdList":          ["on", "off"],
                "cmd":              ""
            }""".replace("\\s+".toRegex(), " ")
    }

    // override fun getRegister(): String {
    //     return """{
    //             "devices":
    //                 [{
    //                     "device_id": "$id",
    //                     "entity_name": "$id",
    //                     "entity_type": "Thing",
    //                     "transport": "MQTT",
    //                     "commands": [
    //                         {"name": "on", "type": "command"},
    //                         {"name": "off", "type": "command"}
    //                     ],
    //                     "attributes": [
    //                         {"object_id": "${if (getType() == EntityType.Camera) "img" else "temp"}", "name": "${if (getType() == EntityType.Camera) "image" else "temperature"}", "type": "String"},
    //                         {"object_id": "stat",  "name": "status",       "type": "Boolean"},
    //                         {"object_id": "timestamp",  "name": "timestamp",         "type": "Integer"},
    //                         {"object_id": "lat",   "name": "latitude",     "type": "Float"},
    //                         {"object_id": "lon",   "name": "longitude",    "type": "Float"},
    //                         {"object_id": "where", "name": "location",     "type": "String"}
    //                     ],
    //                     "static_attributes": [
    //                         {"name": "mission", "type": "String", "value": "$mission"},
    //                         {"name": "domain", "type": "String", "value": "$domain"}
    //                     ]
    //                 }]
    //             }""".replace("\\s+".toRegex(), " ")
    // }

    override fun getStatus(): String {
        return """{
                ${updateSensor()},
                "status":          "$status",
                "timestamp":       ${System.currentTimeMillis()},
                "latitude":        ${latitude},
                "longitude":       ${longitude}
            }""".replace("\\s+".toRegex(), " ")
    }
}
