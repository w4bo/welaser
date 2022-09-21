@file:JvmName("ScalabilityTest")

package it.unibo.devices

import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

fun main(args: Array<String>) {
    listOf(1000 * 60 * 60 * 24 * 2).forEach { duration -> /* 1000 * 60 * 60 * 24 * 2 = 2 days, 1000 * 60 * 200 = 200 minutes */
        listOf(100).forEach { devices -> /* 100 devices */
            listOf(1).forEach { frequency -> /* 1 message every second */
                listOf(0).forEach { payload -> /* 0B of additional payload */
                    val mission = "TEST--dev-$devices--freq-$frequency--pay-$payload--dur-$duration"
                    println("Start. $mission")
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