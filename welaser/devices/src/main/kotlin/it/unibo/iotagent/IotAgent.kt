@file:JvmName("IotAgent")
package it.unibo.iotagent

import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import it.unibo.devices.*
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import org.eclipse.paho.client.mqttv3.IMqttClient
import org.eclipse.paho.client.mqttv3.MqttClient
import org.eclipse.paho.client.mqttv3.MqttConnectOptions
import org.eclipse.paho.client.mqttv3.MqttMessage
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence
import org.json.JSONObject
import java.util.*
import mu.KotlinLogging

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
    // val client2: IMqttClient = MqttClient("tcp://$MOSQUITTO_IP:$MOSQUITTO_PORT_EXT", UUID.randomUUID().toString(), MemoryPersistence())
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
                }
                post("/") {
                    mutex.withLock {
                        val payload = JSONObject(call.receive<String>())
                        payload.getJSONArray("data").forEach {
                            val o = JSONObject(it.toString())
                            println("Subscription: /$FIWARE_API_KEY/${o.getString("id")}/cmd")
                            // client2.connect(connOpts)
                            client.publish("/$FIWARE_API_KEY/${o.getString("id")}/cmd", MqttMessage(payload.toString().toByteArray()))
                            // client2.disconnect()
                        }
                        call.respondText("")
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
        connOpts.setAutomaticReconnect(true)

        // wait for connection
        client.connect(connOpts)
        while (!client.isConnected) {
            // println("Waiting for client connection")
            Thread.sleep(100)
        }

        // subscribe to all mqtt messages
        client.subscribe("#", 0) { topic, message ->
            // synchronized(this) {
                if (topic.contains(FIWARE_API_KEY) && !topic.endsWith("/cmd")) {
                    try {
                        val deviceid = topic.split("/")[2]
                        val payload = JSONObject(String(message!!.payload)) // check that this is a valid JSON object
                        payload.put("timestamp_iota", System.currentTimeMillis())
                        println("Sending from $topic")
                        khttp.async.patch("$ORION_URL/v2/entities/$deviceid/attrs?options=keyValues",
                            mapOf("Content-Type" to "application/json"),
                            // onResponse = {
                            //     logger.debug { "Sending from $topic" }
                            // },
                            data = payload.toString()
                        )
                        // httpRequest("$ORION_URL/v2/entities/$deviceid/attrs?options=keyValues", payload, listOf(Pair("Content-Type", "application/json")), REQUEST_TYPE.PATCH)
                        // println("Done")
                    } catch (e: Exception) {
                        println(e.message)
                        e.printStackTrace()
                    }
                }
            // }
        }
    }
}

fun main() {
    IOTA.start()
}