package it.unibo.devices

import io.github.cdimascio.dotenv.Dotenv
import it.unibo.*
import it.unibo.devices.EntityFactory.createFromFile
import it.unibo.devices.EntityFactory.readJsonFromFile
import it.unibo.writeimages.createFTPClient
import it.unibo.writeimages.upload
import org.json.JSONArray
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.MethodOrderer
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.TestMethodOrder
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.URL
import java.util.*


@TestMethodOrder(MethodOrderer.MethodName::class)
class EntityTest {
    val folder = DATA_MODEL_FOLDER

    @Test
    fun testScalability() {
        scalability(60000, 10, 2, 1000)
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
    fun test0Init() {
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
            val r = EntityFactory.createFromFile("$folder/$ROBOT_FILE", 1, times = 1000)
            r.exec(ROBOT_CMD_START, """{"missionid": "$MISSION_ID"}""")
            r.run()
            khttp.async.patch("${ORION_URL}entities/${ROBOT_ID}/attrs?options=keyValues", mapOf(CONTENTTYPE), data = """{"cmd": {"$ROBOT_CMD_PAUSE" : {}}}""", onResponse = {
                waitFor(r, STATUS.OFF)
                khttp.async.patch("${ORION_URL}entities/${ROBOT_ID}/attrs?options=keyValues", mapOf(CONTENTTYPE), data = """{"cmd": {"$ROBOT_CMD_RESUME" : {}}}""", onResponse = {
                    waitFor(r, STATUS.ON)
                })
            })
        } catch (e: Exception) {
            e.printStackTrace()
            fail(e.message)
        }
    }

    fun init(): Device {
        val d = DeviceMQTT(STATUS.ON, timeStamp(), false, 40.31184130935516, -3.4810637987225532, AGRI_FARM, RandomSensor(), times = 2)
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
            val url = "${ORION_URL}entities?id=${d.id}&options=keyValues"
            println("Looking for ${d.id} at $url")
            s = khttp.get(url).text
        }
        return s
    }

    @Test
    fun testImageUpload() {
        try {
            val dotenv: Dotenv = Dotenv.configure().directory("./.env").load()
            val path = "$DATA_MODEL_FOLDER/camera2.json"
            val e = createFromFile(path, 1, 1)
            val camera = readJsonFromFile(path)
            upload(camera, async = false)
            // Test FTP
            val ftpClient = createFTPClient()
            ftpClient.listFiles().forEach { println(it.name) }
            assertTrue(ftpClient.listFiles().any { it.isFile && java.net.URLDecoder.decode(it.name, "utf-8").contains(camera.getString("id")) })
            // Test HTTP
            URL("http://" + dotenv["IMAGESERVER_IP"] + ":" + dotenv["IMAGESERVER_PORT_HTTP_EXT"]).openStream().use {
                var itemCount = 0
                val br = BufferedReader(InputStreamReader(it))
                var line: String?
                while (br.readLine().also { line = it } != null) {
                    if (line!!.contains("<a href")) itemCount++
                }
                assertTrue(itemCount > 1) // the page also contains <a href="../">../</a>
            }
            // Test update of the URL
            val t = waitDevice(e)
            val obj = JSONArray(t).getJSONObject(0)
            assertTrue(obj.getString(IMAGE_URL).contains(dotenv["IMAGESERVER_IP"]), obj.getString(IMAGE_URL))
            assertEquals(khttp.get(obj.getString(IMAGE_URL)).statusCode, 200)
        } catch (e: Exception) {
            e.printStackTrace()
            fail()
        }
    }

    @Test
    fun testMqttCommand() {
        try {
            val d = init()
            val s = waitDevice(d)
            assertTrue(s.contains(d.id))
            assertTrue(d.status == STATUS.ON)
            khttp.async.patch("${ORION_URL}entities/${d.id}/attrs?options=keyValues", mapOf(CONTENTTYPE), data = """{"cmd": {"off" : {}}}""", onResponse = {
                waitFor(d, STATUS.OFF)
                khttp.async.patch("${ORION_URL}entities/${d.id}/attrs?options=keyValues", mapOf(CONTENTTYPE), data = """{"cmd": {"on" : {}}}""", onResponse = {
                    waitFor(d, STATUS.ON)
                })
            })
        } catch (e: Exception) {
            e.printStackTrace()
            fail(e.message)
        }
    }
}
