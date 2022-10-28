@file:JvmName("MissionSimulator")

package it.unibo.devices

import it.unibo.*
import kotlinx.cli.ArgParser
import kotlinx.cli.ArgType
import kotlinx.cli.default
import org.json.JSONObject
import java.util.concurrent.Executors

fun main(args: Array<String>) {
    val timeout = 1000 // ms
    val folder = DATA_MODEL_FOLDER
    val parser = ArgParser("MissionSimulator")
    val domain by parser.option(ArgType.String, shortName = "domain", description = "Domain name").default(AGRI_FARM)
    parser.parse(args)
    EntityFactory.createFromFile("$folder/$MISSION_FILE", 1, 2).run()
    val robot = EntityFactory.createFromFile("$folder/$ROBOT_FILE", timeout)
    robot.exec(ROBOT_CMD_START, """{"missionid": "$MISSION_ID"}""")
    val executor = Executors.newCachedThreadPool()
    (
        listOf(
            robot,
            DeviceMQTT(STATUS.ON, timeout, false, 40.3120984, -3.481554, domain, RandomSensor()),
            EntityFactory.createFromFile("$folder/weatherstation-1.json", timeout),
            EntityFactory.createFromFile("$folder/camera-1.json", timeout * 3),
            // EntityFactory.createFromFile("$folder/camera-2.json", timeout * 3),
            EntityFactory.createFromFile("$folder/camera2.json", timeout * 3),
            EntityFactory.createFromFile("$folder/camera5.json", timeout * 3),
        )
    ).forEach { d -> executor.submit { d.run() } }
    executor.shutdown()
}