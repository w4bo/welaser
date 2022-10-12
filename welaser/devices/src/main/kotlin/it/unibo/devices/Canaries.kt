@file:JvmName("Canaries")

package it.unibo.devices

import it.unibo.DATAMODEL_FOLDER
import it.unibo.DOMAIN
import it.unibo.FARM_LATITUDE
import it.unibo.FARM_LONGITUDE
import java.lang.Math.pow
import java.util.*
import java.util.concurrent.Executors

val r = Random(42)

fun timeStamp(): Int {
    return Math.max(300.0, r.nextDouble() * 1000).toInt()
}

fun rnd(d: Double, p: Int): Double {
    return d + (r.nextDouble() - 0.5) / pow(10.0, p * 1.0)
}

fun main() {
    val s1: ISensor = Camera()
    val s2: ISensor = RandomSensor()

    val executor = Executors.newCachedThreadPool()
    (
        EntityFactory.createAll(DATAMODEL_FOLDER) +
            listOf(
                DeviceHTTP(STATUS.ON, timeStamp(), true, rnd(FARM_LATITUDE, 6), rnd(FARM_LONGITUDE, 6), DOMAIN, s1),
                DeviceHTTP(STATUS.ON, timeStamp(), false, rnd(FARM_LATITUDE, 6), rnd(FARM_LONGITUDE, 6), DOMAIN, s2),
                DeviceMQTT(STATUS.ON, timeStamp(), true, rnd(FARM_LATITUDE, 6), rnd(FARM_LONGITUDE, 6), DOMAIN, s1),
                DeviceMQTT(STATUS.ON, timeStamp(), false, rnd(FARM_LATITUDE, 6), rnd(FARM_LONGITUDE, 6), DOMAIN, s2),
                DeviceSubscription(STATUS.ON, timeStamp(), true, rnd(FARM_LATITUDE, 6), rnd(FARM_LONGITUDE, 6), DOMAIN, s1),
                DeviceSubscription(STATUS.ON, timeStamp(), false, rnd(FARM_LATITUDE, 6), rnd(FARM_LONGITUDE, 6), DOMAIN, s2),
                DeviceKafka(STATUS.ON, timeStamp(), false, rnd(FARM_LATITUDE, 6), rnd(FARM_LONGITUDE, 6), DOMAIN, s2)
            )
        ).forEach { d -> executor.submit { d.run() } }
    executor.shutdown()
}