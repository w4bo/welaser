@file:JvmName("MissionSimulator")

package it.unibo.devices

import kotlinx.cli.ArgParser
import kotlinx.cli.ArgType
import kotlinx.cli.default
import java.net.URL
import java.util.*
import java.util.concurrent.Executors

val R = Random(3)

fun timeStamp(): Int {
    return Math.max(200.0, R.nextDouble() * 1000).toInt()
}

fun main(args: Array<String>) {
    val parser = ArgParser("MissionSimulator")
    val mission by parser.option(ArgType.String, shortName = "mission", description = "Mission name").default("dummy")
    val domain by parser.option(ArgType.String, shortName = "domain", description = "Domain name").default("canary")
    parser.parse(args)

    val s1: ISensor = Camera()
    val s2: ISensor = Thermometer()
    val s3: ISensor = Thermometer()
    val s4: ISensor = Thermometer()
    val p1: IProtocol = ProtocolMQTT()
    val p2: IProtocol = ProtocolMQTT()
    val p3: IProtocol = ProtocolMQTT()
    val p4: IProtocol = ProtocolMQTT()

    val folder = "datamodels"
    val loader = Thread.currentThread().contextClassLoader
    val url: URL = loader.getResource(folder)!!
    val path: String = url.getPath()
    val robot = EntityFactory.createFromFile("$path/carob-123.json", 500, times = 1000)
    robot.exec("running", "mission-123")

    val executor = Executors.newCachedThreadPool()
    (
            EntityFactory.createAll(folder) +
            listOf(
                robot,
                DeviceMQTT(true, timeStamp(), true, 40.31231176524012, -3.4810422377848910, domain, mission, s1, p1),
                DeviceMQTT(true, timeStamp(), false, 40.31308266787424, -3.4804348644627585, domain, mission, s2, p2),
                DeviceMQTT(true, timeStamp(), false, 40.31285012589443, -3.4811514708229670, domain, mission, s3, p3),
                DeviceMQTT(true, timeStamp(), false, 40.31184130935516, -3.4810637987225532, domain, mission, s4, p4),
            )
    ).forEach { d -> executor.submit { d.run() } } // .forEach { d -> d.run() } //
}