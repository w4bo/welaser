package it.unibo.devices

import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.MethodOrderer
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.TestMethodOrder
import java.net.URL
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

@TestMethodOrder(MethodOrderer.MethodName::class)
class EntityTest {
    val folder = "datamodels"
    val loader = Thread.currentThread().contextClassLoader
    val url: URL = loader.getResource(folder)!!
    val path: String = url.getPath()

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
            val r = EntityFactory.createFromFile("$path/carob-123.json", 1, times = 1000)
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
        while (!s.contains(d.id) && i++ <= 20) {
            if (i > 1) {
                Thread.sleep(1000)
            }
            s = httpRequest(
                "${ORION_URL}/v2/entities/?id=urn:ngsi-ld:${d.id}",
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
                "http://${ORION_IP}:${ORION_PORT_EXT}/v2/entities/urn:ngsi-ld:${d.id}/attrs",
                """{"off": {"type": "command","value": ""}}""",
                listOf(
                    Pair("Content-Type", "application/json"),
                    Pair("fiware-service", FIWARE_SERVICE),
                    Pair("fiware-servicepath", FIWARE_SERVICEPATH)
                ),
                REQUEST_TYPE.PATCH
            )
            Thread.sleep(2000)
            assertFalse(d.status)
            httpRequest(
                "http://${ORION_IP}:${ORION_PORT_EXT}/v2/entities/urn:ngsi-ld:${d.id}/attrs",
                """{"on": {"type": "command","value": ""}}""",
                listOf(
                    Pair("Content-Type", "application/json"),
                    Pair("fiware-service", FIWARE_SERVICE),
                    Pair("fiware-servicepath", FIWARE_SERVICEPATH)
                ),
                REQUEST_TYPE.PATCH
            )
            assertTrue(d.status)
        } catch (e: Exception) {
            e.printStackTrace()
            fail(e.message)
        }
    }
}
