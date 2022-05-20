@file:JvmName("MissionSimulator")

package it.unibo.devices

import it.unibo.ROBOT_CMD_START
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
    EntityFactory.createFromFile("$folder/mission-123.json", 1, 2).run()
    val robot = EntityFactory.createFromFile("$folder/carob-123.json", 1000)
    robot.exec(ROBOT_CMD_START, "mission-123")

    val executor = Executors.newCachedThreadPool()
    (
            listOf(
                robot,
                DeviceMQTT(true, timeStamp(), false, 40.31308266787424, -3.4804348644627585, domain, mission, Thermometer()),
                DeviceMQTT(true, timeStamp(), false, 40.31285012589443, -3.4811514708229670, domain, mission, Thermometer()),
                DeviceMQTT(true, timeStamp(), false, 40.31184130935516, -3.4810637987225532, domain, mission, Thermometer()),
                DeviceMQTT(true, timeStamp(), true, 40.31231176524012, -3.4810422377848910, domain, mission, Camera()),
            )
    ).forEach { d -> d.run() } //.forEach { d -> executor.submit { d.run() } } //
}