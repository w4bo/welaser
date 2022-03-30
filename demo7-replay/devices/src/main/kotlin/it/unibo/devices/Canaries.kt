@file:JvmName("Canaries")
package it.unibo.devices

import java.lang.Math.pow
import java.util.*
import java.util.concurrent.Executors

val r = Random(42)
val DOMAIN = "canary"
val MISSION = "dummy"
val latitude = 40.3123117652
val longitude = -3.481042237784

fun rnd(d: Double, p: Int): Double {
    return d + (r.nextDouble() - 0.1) / pow(10.0, p * 1.0)
}

fun main(args: Array<String>) {
    val s1: ISensor = Camera()
    val s2: ISensor = Thermometer()
    val p1: IProtocol = ProtocolHTTP()
    val p2: IProtocol = ProtocolHTTP()
    val p3: IProtocol = ProtocolMQTT()
    val p4: IProtocol = ProtocolMQTT()
    val p5: IProtocol = ProtocolSubscription()
    val p6: IProtocol = ProtocolSubscription()
    val p7: IProtocol = ProtocolKafka()
    val p8: IProtocol = ProtocolKafka()

    val executor = Executors.newCachedThreadPool()
    listOf(
        DeviceFIWARE(true, 1000, true, rnd(latitude, 6), rnd(longitude, 6), DOMAIN, MISSION, s1, p1),
        DeviceFIWARE(true, 1000, false, rnd(latitude, 6), rnd(longitude, 6), DOMAIN, MISSION, s2, p2),
        DeviceMQTT(true, 1000, true, rnd(latitude, 6), rnd(longitude, 6), DOMAIN, MISSION, s1, p3),
        DeviceMQTT(true, 1000, false, rnd(latitude, 6), rnd(longitude, 6), DOMAIN, MISSION, s2, p4),
        DeviceSubscription(true, 1000, true, rnd(latitude, 6), rnd(longitude, 6), DOMAIN, MISSION, s1, p5),
        DeviceSubscription(true, 1000, false, rnd(latitude, 6), rnd(longitude, 6), DOMAIN, MISSION, s2, p6),
        DeviceKafka(true, 1000, true, rnd(latitude, 6), rnd(longitude, 6), DOMAIN, MISSION, s1, p7),
        DeviceKafka(true, 1000, false, rnd(latitude, 6), rnd(longitude, 6), DOMAIN, MISSION, s2, p8)
    ).forEach { d ->
        executor.submit { d.run() }
    }
}