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

fun timeStamp(): Int {
    return Math.max(300.0, r.nextDouble() * 1000).toInt()
}

fun rnd(d: Double, p: Int): Double {
    return d + (r.nextDouble() - 0.5) / pow(10.0, p * 1.0)
}

fun main(args: Array<String>) {
    val s1: ISensor = Camera()
    val s2: ISensor = Thermometer()

    val executor = Executors.newCachedThreadPool()
    (
        EntityFactory.createAll("/datamodels") +
        listOf(
            DeviceHTTP(true, timeStamp(), true, rnd(latitude, 6), rnd(longitude, 6), DOMAIN, MISSION, s1),
            DeviceHTTP(true, timeStamp(), false, rnd(latitude, 6), rnd(longitude, 6), DOMAIN, MISSION, s2),
            DeviceMQTT(true, timeStamp(), true, rnd(latitude, 6), rnd(longitude, 6), DOMAIN, MISSION, s1),
            DeviceMQTT(true, timeStamp(), false, rnd(latitude, 6), rnd(longitude, 6), DOMAIN, MISSION, s2),
            DeviceSubscription(true, timeStamp(), true, rnd(latitude, 6), rnd(longitude, 6), DOMAIN, MISSION, s1),
            DeviceSubscription(true, timeStamp(), false, rnd(latitude, 6), rnd(longitude, 6), DOMAIN, MISSION, s2),
            // DeviceKafka(true, timeStamp(), true, rnd(latitude, 6), rnd(longitude, 6), DOMAIN, MISSION, s1),
            DeviceKafka(true, timeStamp(), false, rnd(latitude, 6), rnd(longitude, 6), DOMAIN, MISSION, s2)
        )
    ).forEach { d -> executor.submit { d.run() } } //.forEach { d -> d.run() } //
    executor.shutdown()
}