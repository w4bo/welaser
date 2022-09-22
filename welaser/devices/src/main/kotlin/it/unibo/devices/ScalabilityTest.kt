@file:JvmName("ScalabilityTest")

package it.unibo.devices

import kotlinx.cli.ArgParser
import kotlinx.cli.ArgType
import kotlinx.cli.default
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

/**
 * Test the scalability of the system
 * @param duration of the test
 * @param devices number of devices
 * @param frequency messages per second
 * @param payload additional payload
 */
fun scalability(duration: Int, devices: Int, frequency: Int, payload: Int) {
    listOf(duration).forEach { duration -> /* (ms) */
        listOf(devices).forEach { devices -> /* #devices */
            listOf(frequency).forEach { frequency -> /* #mgs/s */
                listOf(payload).forEach { payload -> /* bytes of additional payload */
                    val mission = "TEST--dev-$devices--freq-$frequency--pay-$payload--dur-$duration"
                    println("Start. $mission")
                    val executor = Executors.newCachedThreadPool()
                    val periodMs = 1000 / frequency
                    (1..devices)
                        .map {
                            DeviceMQTT(STATUS.ON, periodMs, false, 40.31308266787424, -3.4804348644627585, DOMAIN, mission, RandomSensor(), times = duration / periodMs)
                        }.forEach {
                            d -> executor.submit { d.run() }
                        }
                    executor.shutdown()
                    executor.awaitTermination(Long.MAX_VALUE, TimeUnit.SECONDS)
                    println("Done. $mission")
                }
            }
        }
    }
}

fun main(args: Array<String>) {
    val parser = ArgParser("ScalabilityTest")
    val defaultDuration = 1000 * 60 * 60 * 24 * 3 /* 1000 * 60 * 60 * 24 * 2 = 2 days, 1000 * 60 * 200 = 200 minutes */
    val defaultDevices = 100
    val defaultFrequency = 1
    val defaultPayload = 0
    val duration by parser.option(ArgType.Int, shortName = "duration", description = "duration (ms)")
        .default(defaultDuration)
    val devices by parser.option(ArgType.Int, shortName = "devices", description = "devices")
        .default(defaultDevices)
    val frequency by parser.option(ArgType.Int, shortName = "frequency", description = "frequency")
        .default(defaultFrequency)
    val payload by parser.option(ArgType.Int, shortName = "payload", description = "payload (B)")
        .default(defaultPayload)
    parser.parse(args)
    scalability(duration, devices, frequency, payload)
}