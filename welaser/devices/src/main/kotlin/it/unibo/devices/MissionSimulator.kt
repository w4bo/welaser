@file:JvmName("MissionSimulator")

package it.unibo.devices

import it.unibo.DATAMODEL_FOLDER
import it.unibo.DOMAIN
import it.unibo.ROBOT_CMD_START
import kotlinx.cli.ArgParser
import kotlinx.cli.ArgType
import kotlinx.cli.default
import java.util.concurrent.Executors

fun main(args: Array<String>) {
    val timeout = 1000 // ms
    val folder = DATAMODEL_FOLDER
    val parser = ArgParser("MissionSimulator")
    val domain by parser.option(ArgType.String, shortName = "domain", description = "Domain name").default(DOMAIN)
    parser.parse(args)
    EntityFactory.createFromFile("$folder/mission-123.json", 1, 2).run()
    val robot = EntityFactory.createFromFile("$folder/carob-1.json", timeout)
    robot.exec(ROBOT_CMD_START, "mission-123")
    val executor = Executors.newCachedThreadPool()
    (
            listOf(
                robot,
                // DeviceMQTT(STATUS.ON, timeStamp(), false, 40.31308266787424, -3.4804348644627585, domain, RandomSensor()),
                // DeviceMQTT(STATUS.ON, timeStamp(), false, 40.31285012589443, -3.4811514708229670, domain, RandomSensor()),
                DeviceMQTT(STATUS.ON, timeout, false, 40.3120984, -3.481554, domain, RandomSensor()),
                // DeviceMQTT(STATUS.ON, timeStamp(), false, 40.31231176524012, -3.4810422377848910, domain, Camera()),
                EntityFactory.createFromFile("$folder/weatherstation-1.json", timeout),
                EntityFactory.createFromFile("$folder/camera-1.json", timeout * 3),
                EntityFactory.createFromFile("$folder/camera-2.json", timeout * 3),
                // EntityFactory.createFromFile("$folder/camera-3.json", timeout * 3)
            )
            ).forEach { d -> executor.submit { d.run() } }
    executor.shutdown()
}