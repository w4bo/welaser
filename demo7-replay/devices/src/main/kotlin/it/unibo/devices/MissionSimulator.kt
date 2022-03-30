@file:JvmName("MissionSimulator")
package it.unibo.devices

import kotlinx.cli.ArgParser
import kotlinx.cli.ArgType
import kotlinx.cli.default
import java.util.*
import java.util.concurrent.Executors

val R = Random(3)

fun timeStamp(): Int {
    return Math.max(100.0, R.nextDouble() * 1000).toInt()
}

fun main(args: Array<String>) {
    val parser = ArgParser("MissionSimulator")
    val mission by parser.option(ArgType.String, shortName = "mission", description = "Mission name").default("canary")
    val domain by parser.option(ArgType.String, shortName = "domain", description = "Domain name").default("dummy")
    parser.parse(args)

    val s1: ISensor = Camera()
    val s2: ISensor = Thermometer()
    val s3: ISensor = Thermometer()
    val s4: ISensor = Thermometer()
    val p1: IProtocol = ProtocolHTTP()
    val p2: IProtocol = ProtocolHTTP()
    val p3: IProtocol = ProtocolHTTP()
    val p4: IProtocol = ProtocolHTTP()

    val executor = Executors.newCachedThreadPool()
    listOf(
        DeviceFIWARE(true, timeStamp(), true, 40.31231176524012, -3.4810422377848910, mission, domain, s1, p1),
        DeviceFIWARE(true, timeStamp(), false, 40.31308266787424, -3.4804348644627585, mission, domain, s2, p2),
        DeviceFIWARE(true, timeStamp(), false, 40.31285012589443, -3.4811514708229670, mission, domain, s3, p3),
        DeviceFIWARE(true, timeStamp(), false, 40.31184130935516, -3.4810637987225532, mission, domain, s4, p4),
    ).forEach { d ->
        executor.submit { d.run() }
    }
}