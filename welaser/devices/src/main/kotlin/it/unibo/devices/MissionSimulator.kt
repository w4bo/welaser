@file:JvmName("MissionSimulator")

package it.unibo.devices

import kotlinx.cli.ArgParser
import kotlinx.cli.ArgType
import kotlinx.cli.default
import java.util.concurrent.Executors

fun main(args: Array<String>) {
    val parser = ArgParser("MissionSimulator")
    val domain by parser.option(ArgType.String, shortName = "domain", description = "Domain name").default(DOMAIN) // .default("d506218")
    val mission by parser.option(ArgType.String, shortName = "mission", description = "Mission name").default(MISSION) // .default("m882099")
    parser.parse(args)

    val folder = "/datamodels"
    val robot = EntityFactory.createFromFile("$folder/carob-123.json", 500)
    robot.exec("running", "mission-123")

    val executor = Executors.newCachedThreadPool()
    (
            listOf(
                robot,
                DeviceMQTT(true, timeStamp(), false, 40.31308266787424, -3.4804348644627585, domain, mission, Thermometer()),
                DeviceMQTT(true, timeStamp(), false, 40.31285012589443, -3.4811514708229670, domain, mission, Thermometer()),
                DeviceMQTT(true, timeStamp(), false, 40.31184130935516, -3.4810637987225532, domain, mission, Thermometer()),
                DeviceMQTT(true, timeStamp(), true, 40.31231176524012, -3.4810422377848910, domain, mission, Camera()),
            )
    ).forEach { d -> executor.submit { d.run() } } //.forEach { d -> d.run() } //
}