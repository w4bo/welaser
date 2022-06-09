@file:JvmName("MissionSimulator")

package it.unibo.devices

import it.unibo.ROBOT_CMD_START
import java.util.concurrent.Executors

fun main(args: Array<String>) {
    val timeout = 1000
    val folder = "/datamodels"
    EntityFactory.createFromFile("$folder/mission-123.json", 1, 2).run()
    val robot = EntityFactory.createFromFile("$folder/carob-1.json", timeout)
    robot.exec(ROBOT_CMD_START, "mission-123")
    val executor = Executors.newCachedThreadPool()
    (
            listOf(
                robot,
                // DeviceMQTT(STATUS.ON, timeStamp(), false, 40.31308266787424, -3.4804348644627585, domain, mission, Thermometer()),
                // DeviceMQTT(STATUS.ON, timeStamp(), false, 40.31285012589443, -3.4811514708229670, domain, mission, Thermometer()),
                // DeviceMQTT(STATUS.ON, timeStamp(), false, 40.31184130935516, -3.4810637987225532, domain, mission, Thermometer()),
                // DeviceMQTT(STATUS.ON, timeStamp(), false, 40.31231176524012, -3.4810422377848910, domain, mission, Camera()),
                EntityFactory.createFromFile("$folder/weatherstation-1.json", timeout),
                EntityFactory.createFromFile("$folder/camera-1.json", timeout * 3),
                EntityFactory.createFromFile("$folder/camera-2.json", timeout * 3),
                // EntityFactory.createFromFile("$folder/camera-3.json", timeout * 3)
            )
    ).forEach { d -> executor.submit { d.run() } } //.forEach { d -> d.run() } //
    executor.shutdown()
}