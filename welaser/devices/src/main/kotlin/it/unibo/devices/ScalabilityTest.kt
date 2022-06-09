@file:JvmName("ScalabilityTest")

package it.unibo.devices

import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

fun main(args: Array<String>) {
    (120000..120000).forEach { duration ->
        (10..80 step 20).forEach { devices ->
            (1..41 step 20).forEach { frequency ->
                (0..0 step 5000).forEach { payload ->
                    val mission = "TEST--dev-$devices--freq-$frequency--pay-$payload--dur-$duration"
                    val executor = Executors.newCachedThreadPool()
                    val periodMs = 1000 / frequency
                    (1..devices).map {
                        DeviceMQTT(STATUS.ON, periodMs, false, 40.31308266787424, -3.4804348644627585, DOMAIN, mission, RandomSensor(), times=duration / periodMs)
                    }.forEach { d -> executor.submit { d.run() } }
                    executor.shutdown()
                    executor.awaitTermination(Long.MAX_VALUE, TimeUnit.SECONDS)
                    println("Done. $mission")
                }
            }
        }
    }
}