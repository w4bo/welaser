package it.unibo.devices

import it.unibo.ROBOT_CMD_PAUSE
import it.unibo.ROBOT_CMD_RESUME
import it.unibo.ROBOT_CMD_START
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Assertions.fail
import org.junit.jupiter.api.MethodOrderer
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.TestMethodOrder
import java.util.*

@TestMethodOrder(MethodOrderer.MethodName::class)
class EntityTest {
    val folder = "/datamodels"

    @Test
    fun testScalability() {
        scalability(30000, 10, 2, 1000)
    }

    @Test
    fun testCamera() {
        try {
            Base64.getDecoder().decode(Camera().sense())
        } catch (e: Exception) {
            fail(e.message)
        }
    }

    @Test
    fun testInit() {
        try {
            EntityFactory.createAll(folder).forEach { it.run() }
        } catch (e: Exception) {
            e.printStackTrace()
            fail(e.message)
        }
    }

    fun waitFor(d: Device, goal: STATUS) {
        var retry = 100
        while (retry-- > 0 && goal != d.status) {
            Thread.sleep(500)
        }
        assertTrue(retry > 0, "Timeout")
        assertTrue(d.status == goal)
    }

    @Test
    fun testRobot() {
        try {
            val r = EntityFactory.createFromFile("$folder/carob-1.json", 1, times = 1000)
            r.exec(ROBOT_CMD_START, "mission-123")
            r.run()
            khttp.async.patch("$ORION_URL/v2/entities/carob-1/attrs?options=keyValues", mapOf(CONTENTTYPE), data = """{"cmd": {"$ROBOT_CMD_PAUSE" : {}}}""", onResponse = {
                waitFor(r, STATUS.OFF)
                khttp.async.patch("$ORION_URL/v2/entities/carob-1/attrs?options=keyValues", mapOf(CONTENTTYPE), data = """{"cmd": {"$ROBOT_CMD_RESUME" : {}}}""", onResponse = {
                    waitFor(r, STATUS.ON)
                })
            })
        } catch (e: Exception) {
            e.printStackTrace()
            fail(e.message)
        }
    }

    fun init(): Device {
        val d = DeviceMQTT(STATUS.ON, timeStamp(), false, 40.31184130935516, -3.4810637987225532, "foo", "bar", RandomSensor(), times = 2)
        d.run()
        return d
    }

    fun waitDevice(d: Device): String {
        var s = "foo"
        var i = 0
        println("Waiting for ${d.id}")
        while (!s.contains(d.id) && i++ <= 50) {
            if (i > 1) {
                Thread.sleep(100)
            }
            println("Looking for ${d.id} at ${ORION_URL}/v2/entities?id=${d.id}")
            s = khttp.get("${ORION_URL}/v2/entities?id=${d.id}").text
            // s = httpRequest(
            //     "${ORION_URL}/v2/entities/?id=${d.id}",
            //     // listOf(Pair("fiware-service", FIWARE_SERVICE), Pair("fiware-servicepath", FIWARE_SERVICEPATH)),
            // )
        }
        return s
    }

    @Test
    fun testMqttCommand() {
        try {
            val d = init()
            val s = waitDevice(d)
            assertTrue(s.contains(d.id))
            assertTrue(d.status == STATUS.ON)
            khttp.async.patch("$ORION_URL/v2/entities/${d.id}/attrs?options=keyValues", mapOf(CONTENTTYPE), data = """{"cmd": {"off" : {}}}""", onResponse = {
                waitFor(d, STATUS.OFF)
                khttp.async.patch("$ORION_URL/v2/entities/${d.id}/attrs?options=keyValues", mapOf(CONTENTTYPE), data = """{"cmd": {"on" : {}}}""", onResponse = {
                    waitFor(d, STATUS.ON)
                })
            })
            // httpRequest(
            //     "$ORION_URL/v2/entities/${d.id}/attrs?options=keyValues",
            //     """{"cmd": {"off" : {}}}""",
            //     listOf(Pair("Content-Type", "application/json")),
            //     // listOf(Pair("Content-Type", "application/json"), Pair("fiware-service", FIWARE_SERVICE), Pair("fiware-servicepath", FIWARE_SERVICEPATH)),
            //     REQUEST_TYPE.PATCH
            // )

            // httpRequest(
            //     "$ORION_URL/v2/entities/${d.id}/attrs?options=keyValues",
            //     """{"cmd": {"on" : {}}}""",
            //     listOf(Pair("Content-Type", "application/json")),
            //     // listOf(Pair("Content-Type", "application/json"), Pair("fiware-service", FIWARE_SERVICE), Pair("fiware-servicepath", FIWARE_SERVICEPATH)),
            //     REQUEST_TYPE.PATCH
            // )

        } catch (e: Exception) {
            e.printStackTrace()
            fail(e.message)
        }
    }
}
