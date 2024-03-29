package it.unibo.devices

import io.github.cdimascio.dotenv.Dotenv
import io.ktor.network.sockets.*
import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import it.unibo.*
import mu.KotlinLogging
import org.apache.kafka.clients.producer.KafkaProducer
import org.apache.kafka.clients.producer.ProducerRecord
import org.eclipse.paho.client.mqttv3.IMqttClient
import org.eclipse.paho.client.mqttv3.MqttClient
import org.eclipse.paho.client.mqttv3.MqttConnectOptions
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence
import org.json.JSONObject
import java.net.ServerSocket
import java.text.DateFormat
import java.text.SimpleDateFormat
import java.util.*
import kotlin.random.Random


// NB: comments from the dotenv file will be loaded as strings as well! Be careful!
val dotenv: Dotenv = Dotenv.configure().directory("./.env").load()
val DRACO_IP = dotenv["DRACO_IP"]
val DRACO_PORT_EXT = dotenv["DRACO_PORT_EXT"].toInt()
val DRACO_RAW_TOPIC = dotenv["DRACO_RAW_TOPIC"]
val ORION_IP = dotenv["ORION_IP"]
val ORION_PORT_EXT = dotenv["ORION_PORT_EXT"].toInt()
val ORION_URL = "http://${ORION_IP}:${ORION_PORT_EXT}/v2/"
val DEVICE_IP = dotenv["DEVICE_IP"]
val IOTA_PORT_EXT = dotenv["IOTA_PORT_EXT"].toInt()
val KAFKA_IP = dotenv["KAFKA_IP"]
val KAFKA_PORT_EXT = dotenv["KAFKA_PORT_EXT"].toInt()
val FIWARE_API_KEY = dotenv["FIWARE_API_KEY"]
val MOSQUITTO_USER = dotenv["MOSQUITTO_USER"]
val MOSQUITTO_PWD = dotenv["MOSQUITTO_PWD"]
val MOSQUITTO_IP = dotenv["MOSQUITTO_IP"]
val MOSQUITTO_PORT_EXT = dotenv["MOSQUITTO_PORT_EXT"].toInt()
val CONTENTTYPE = "Content-Type" to "application/json"

fun createEntity(id: String, type: String, domain: String, status: String, latitude: Double, longitude: Double, append: String = ""): String {
    return """{
                "$ID":             "$id",
                "$NAME":           "${id.subSequence(id.lastIndexOf(":") + 1, id.length)}",
                "$TYPE":           "$DEVICE",
                "$CREATED_BY":     "$type",
                "status":          "$status",                      
                "$TIMESTAMP":      ${System.currentTimeMillis()},
                "$LOCATION": {
                    "type": "Point",
                    "$COORDINATES": [
                        $longitude,
                        $latitude
                    ]
                },                
                "$AREA_SERVED":     "$domain",
                "$CMD_LIST":        ["on", "off"],
                "$CMD":             ""
                ${if (append != "") ", $append" else { "" }}
            }""".replace("\\s+".toRegex(), " ")
}

/**
 * Some entity types
 */
enum class EntityType { Image, Timestamp, Thermometer, Dummy, Heartbeat, AggDevice }

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
    fun sense(): Any
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

class ProtocolMQTT : IProtocol {
    var client: IMqttClient = MqttClient("tcp://$MOSQUITTO_IP:$MOSQUITTO_PORT_EXT", UUID.randomUUID().toString(), MemoryPersistence())
    val connOpts = MqttConnectOptions()

    @Synchronized
    override fun register(s: String) {
        connOpts.isCleanSession = true
        connOpts.userName = MOSQUITTO_USER
        connOpts.password = MOSQUITTO_PWD.toCharArray()
        client.connect(connOpts)
        while (!client.isConnected) {
            Thread.sleep(100)
        }
        khttp.async.post("${ORION_URL}entities?options=keyValues", mapOf(CONTENTTYPE), data = s, onResponse = { /* connection.disconnect() */ })
    }

    @Synchronized
    override fun send(payload: String, topic: String) {
        client.publish(topic, payload.toByteArray(), 0, false)
    }

    @Synchronized
    override fun listen(topic: String, f: (commandName: String, payload: String) -> Unit) {
        client.subscribe(topic) { _, message ->
            val s = String(message!!.payload)
            JSONObject(s).getJSONArray("data").forEach {
                var o = JSONObject(it.toString())
                if (o.has(CMD) && o.get(CMD).toString().isNotEmpty()) {
                    o = o.getJSONObject(CMD)
                    val commandName = o.keys().next()!!
                    f(commandName, o.getJSONObject(commandName).toString())
                }
                // client.publish(topic + "exe", MqttMessage("OK".toByteArray()))
            }
        }
    }

    @Synchronized
    override fun close() {
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
    }
}

class ProtocolHTTP : IProtocol {

    fun reg(s: String, retry: Int) {
        // khttp.async.post("${ORION_URL}entities?options=keyValues", mapOf(CONTENTTYPE), data = s) {
        val r = khttp.post("${ORION_URL}entities?options=keyValues", mapOf(CONTENTTYPE), data = s)
        val text = r.text
        if (text.contains("BadRequest")) {
            if (retry == 0) {
                throw throw IllegalArgumentException(JSONObject(s).getString("id") + ": $text\n$s")
            } else {
                Thread.sleep(1000)
                reg(s, retry - 1)
            }
        }
    }

    @Synchronized
    override fun register(s: String) {
        JSONObject(s) // check if s is a valid json object
        // delete the entity if exists
        khttp.delete("${ORION_URL}entities/" + JSONObject(s).getString(ID))
        reg(s, 3)
    }

    @Synchronized
    override fun send(payload: String, topic: String) {
        val payloadJSON = JSONObject(payload)
        val id = payloadJSON.get("id")
        payloadJSON.remove("id")
        if (payloadJSON.has(TYPE)) {
            payloadJSON.remove(TYPE)
        }
        if (payloadJSON.has(CMD)) {
            payloadJSON.remove(CMD)
        }
        khttp.async.patch(
            "${ORION_URL}entities/$id/attrs?options=keyValues",
            mapOf(CONTENTTYPE),
            data = payloadJSON.toString(),
            onResponse = {
                if (statusCode != 204) throw IllegalArgumentException(text)
            }
        )
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
        producer!!.send(ProducerRecord(DRACO_RAW_TOPIC + "." + AGRI_FARM.replace("[-:_]".toRegex(), ""), payload))
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
    open val s: ISensor,
    val p: IProtocol,
    val times: Int = 1000
) : ISensor by s, IActuator, IProtocol by p {
    open val id: String = "urn:ngsi-ld:$DEVICE:" + getType().toString() + getId()
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
        val prop = if (getType() == EntityType.Image) { IMAGE } else { TEMPERATURE }
        return when (status) {
            STATUS.ON -> {
                updatePosition()
                sensedValue = """"$CONTROLLED_PROPERTY": ["$prop"], "$VALUE": ["${s.sense()}"]"""
                sensedValue
            }
            else -> sensedValue
        }
    }

    fun curDate(): String {
        val date = Calendar.getInstance().time
        val dateFormat: DateFormat = SimpleDateFormat("yyyy-mm-dd hh:mm:ss")
        return dateFormat.format(date)
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
            // println("${curDate()} $id - iterating")
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
    s: ISensor
) : Device(status, timeoutMs, moving, latitude, longitude, domain, s, ProtocolSubscription()) {
    override fun getStatus(): String = """{"data": [${createEntity(id, "Subscription", domain, status.toString(), latitude, longitude, append = updateSensor())}]}"""
}

open class DeviceHTTP(
    status: STATUS,
    timeoutMs: Int,
    moving: Boolean,
    latitude: Double,
    longitude: Double,
    domain: String,
    s: ISensor,
    p: IProtocol = ProtocolHTTP(),
    times: Int = 1000
) : Device(status, timeoutMs, moving, latitude, longitude, domain, s, p, times) {
    var server: NettyApplicationEngine? = null

    fun getIpPort(): Pair<String, Int> {
        val socket = ServerSocket(0)
        val port = socket.localPort
        socket.close()
        return Pair(socket.inetAddress.toString(), port)
    }

    override fun register(s: String) {
        super.register(s)
        if (JSONObject(s).has(CMD_LIST)) {
            val socket = getIpPort()
            server = embeddedServer(Netty, port = socket.second, host = "0.0.0.0") {
                routing {
                    get("/") {
                        call.respondText("")
                    }
                    post("/") {
                        JSONObject(call.receive<String>()).getJSONArray("data").forEach {
                            var o = JSONObject(it.toString())
                            if (o.has(CMD) && o.get(CMD).toString().isNotEmpty()) {
                                o = o.getJSONObject(CMD)
                                val commandName = o.keys().next()!!
                                exec(commandName, o.getJSONObject(commandName).toString())
                            }
                        }
                        call.respondText("")
                    }
                }
            }.start(wait = false)
            val r = khttp.post(
                "http://${DRACO_IP}:${DRACO_PORT_EXT}/v2/subscriptions", mapOf(CONTENTTYPE), data = """{
                    "description": "Notify $id for commands",
                    "subject": { "entities": [{ "id" : "$id" }], "condition": { "attrs": [ "$CMD" ] }},
                    "notification": { "http": { "url": "http://${DEVICE_IP}:${socket.second}" }, "attrsFormat" : "keyValues", "attrs" : ["$CMD"] }
                }""".trimIndent()
            )
            if (r.statusCode != 200) {
                throw java.lang.IllegalArgumentException(r.text)
            }
        }
    }

    override fun getStatus(): String = createEntity(id, "OCB", domain, status.toString(), latitude, longitude, append = updateSensor())
}

class DeviceKafka(
    status: STATUS,
    timeoutMs: Int,
    moving: Boolean,
    latitude: Double,
    longitude: Double,
    domain: String,
    s: ISensor
) : DeviceHTTP(status, timeoutMs, moving, latitude, longitude, domain, s, ProtocolKafka()) {
    override fun getStatus(): String = createEntity(id, "KAFKA", domain, status.toString(), latitude, longitude, append = updateSensor())
}

class DeviceMQTT(
    status: STATUS,
    timeoutMs: Int,
    moving: Boolean,
    latitude: Double,
    longitude: Double,
    domain: String,
    s: ISensor,
    times: Int = 1000
) : Device(status, timeoutMs, moving, latitude, longitude, domain, s, ProtocolMQTT(), times = times) {
    override val sendTopic = "/$FIWARE_API_KEY/$id/attrs"
    override val listenTopic: String = "/$FIWARE_API_KEY/$id/$CMD"
    override val listenCallback: (commandName: String, payload: String) -> Unit = { c, p -> exec(c, p) }

    override fun getRegister(): String = createEntity(id, "MQTT", domain, status.toString(), latitude, longitude, append = updateSensor())

    override fun getStatus(): String {
        return """{
                ${updateSensor()},
                "status":     "$status",
                "$TIMESTAMP": ${System.currentTimeMillis()},
                "$LOCATION": {
                    "type": "Point",
                    "$COORDINATES": [
                        $longitude,
                        $latitude
                    ]
                }
            }""".replace("\\s+".toRegex(), " ")
    }
}
