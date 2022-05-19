package it.unibo.devices

import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.MethodOrderer
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.TestMethodOrder

@TestMethodOrder(MethodOrderer.MethodName::class)
class EntityTest {
    val folder = "/datamodels"

    @Test
    fun testInit() {
        try {
            EntityFactory.createAll(folder).forEach { it.run() }
        } catch (e: Exception) {
            e.printStackTrace()
            fail(e.message)
        }
    }

    @Test
    fun testRobot() {
        try {
            val r = EntityFactory.createFromFile("$folder/carob-123.json", 1, times = 1000)
            r.exec("running", "mission-123")
            r.run()
        } catch (e: Exception) {
            e.printStackTrace()
            fail(e.message)
        }
    }

    fun init(): Device {
        val s4: ISensor = Thermometer()
        val p4: IProtocol = ProtocolMQTT()
        val d = DeviceMQTT(true, timeStamp(), false, 40.31184130935516, -3.4810637987225532, "foo", "bar", s4, p4, times = 2)
        d.run()
        return d
    }

    fun waitDevice(d: Device): String {
        var s = "foo"
        var i = 0
        println("Waiting for ${d.id}")
        while (!s.contains(d.id) && i++ <= 20) {
            if (i > 1) {
                Thread.sleep(1000)
            }
            s = httpRequest(
                "${ORION_URL}/v2/entities/?id=${d.id}",
                null,
                listOf(Pair("fiware-service", FIWARE_SERVICE), Pair("fiware-servicepath", FIWARE_SERVICEPATH)),
                REQUEST_TYPE.GET
            )
        }
        return s
    }

    @Test
    fun waitMqttDevice() {
        try {
            val d = init()
            val s = waitDevice(d)
            print(d.id)
            assertTrue(s.contains(d.id))
        } catch (e: Exception) {
            e.printStackTrace()
            fail(e.message)
        }
    }

    @Test
    fun testMqttCommand() {
        try {
            val d = init()
            waitDevice(d)

            assertTrue(d.status)
            httpRequest(
                "$ORION_URL/v2/entities/${d.id}/attrs?options=keyValues",
                // """{"off": {"type": "command","value": ""}}""",
                """{"cmd": {"off" : {}}}""",
                listOf(Pair("Content-Type", "application/json")),
                // listOf(Pair("Content-Type", "application/json"), Pair("fiware-service", FIWARE_SERVICE), Pair("fiware-servicepath", FIWARE_SERVICEPATH)),
                REQUEST_TYPE.PATCH
            )
            Thread.sleep(2000)
            assertFalse(d.status)
            httpRequest(
                "$ORION_URL/v2/entities/${d.id}/attrs?options=keyValues",
                // """{"on": {"type": "command","value": ""}}""",
                """{"cmd": "{on : {}}"}""",
                listOf(Pair("Content-Type", "application/json")),
                // listOf(Pair("Content-Type", "application/json"), Pair("fiware-service", FIWARE_SERVICE), Pair("fiware-servicepath", FIWARE_SERVICEPATH)),
                REQUEST_TYPE.PATCH
            )
            assertTrue(d.status)
        } catch (e: Exception) {
            e.printStackTrace()
            fail(e.message)
        }
    }
}
