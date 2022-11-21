@file:JvmName("IotAgent")

package it.unibo.iotagent

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import it.unibo.devices.*
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import mu.KotlinLogging
import org.eclipse.paho.client.mqttv3.IMqttClient
import org.eclipse.paho.client.mqttv3.MqttClient
import org.eclipse.paho.client.mqttv3.MqttConnectOptions
import org.eclipse.paho.client.mqttv3.MqttMessage
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence
import org.json.JSONObject
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.util.*

class IOTA {
    private val logger = KotlinLogging.logger {}

    companion object {
        val iota = IOTA()
        fun start() {
            iota.start()
            iota.startServer()
        }

        fun stop() {
            iota.stop()
        }
    }

    val client: IMqttClient = MqttClient("tcp://$MOSQUITTO_IP:$MOSQUITTO_PORT_EXT", UUID.randomUUID().toString(), MemoryPersistence())
    val connOpts = MqttConnectOptions()
    val mutex = Mutex()
    var server: NettyApplicationEngine? = null

    fun stop() {
        server?.stop()
    }

    fun startServer() {
        server = embeddedServer(Netty, port = IOTA_NORTH_PORT, host = "0.0.0.0") {
            routing {
                get("/") {
                    call.respondText("")
                    val current = LocalDateTime.now()
                    val formatter = DateTimeFormatter.ofPattern("MM/dd/yyyy, HH:mm:ss")
                    println("Alive at ${current.format(formatter)}")
                }
                post("/") {
                    mutex.withLock {
                        try {
                            val payload = JSONObject(call.receive<String>())
                            payload.getJSONArray("data").forEach {
                                val o = JSONObject(it.toString())
                                client.publish("/$FIWARE_API_KEY/${o.getString("id")}/cmd", MqttMessage(payload.toString().toByteArray()))
                            }
                            call.respondText("")
                        } catch (e: Exception) {
                            call.respondText(e.message!!, status = HttpStatusCode.Forbidden)
                        }
                    }
                }
            }
        }.start(wait = true)
    }

    fun start() {
        connOpts.isCleanSession = true
        connOpts.userName = MOSQUITTO_USER
        connOpts.password = MOSQUITTO_PWD.toCharArray()
        connOpts.connectionTimeout = 0
        connOpts.keepAliveInterval = 0
        connOpts.isAutomaticReconnect = true
        client.connect(connOpts)
        // subscribe to all mqtt messages
        client.subscribe("#", 0) { topic, message ->
            if (topic.contains(FIWARE_API_KEY) && !topic.endsWith("/cmd")) {
                try {
                    val deviceid = topic.split("/")[2]
                    val payload = JSONObject(String(message!!.payload)) // check that this is a valid JSON object
                    payload.put("timestamp_iota", System.currentTimeMillis())
                    khttp.async.patch(
                        "${ORION_URL}entities/$deviceid/attrs?options=keyValues",
                        mapOf("Content-Type" to "application/json"),
                        data = payload.toString().replace("=", "%3D")
                    )
                } catch (e: Exception) {
                    println(e.message)
                    e.printStackTrace()
                }
            }
        }
    }
}

fun main() {
    IOTA.start()
}