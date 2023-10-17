package it.unibo.devices

import io.github.cdimascio.dotenv.Dotenv
import it.unibo.*
import it.unibo.devices.EntityFactory.createAll
import it.unibo.devices.EntityFactory.createFromFile
import it.unibo.devices.EntityFactory.readJsonFromFile
import it.unibo.writeimages.createFTPClient
import it.unibo.writeimages.ftpImageName
import it.unibo.writeimages.getExt
import it.unibo.writeimages.upload
import org.json.JSONArray
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.MethodOrderer
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.TestMethodOrder
import java.io.*
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
            val c = Camera()
            (1..100).forEach { Base64.getDecoder().decode(c.sense().toString().replace("%3D", "=")) }
        } catch (e: Exception) {
            e.printStackTrace()
            fail(e.message)
        }
    }

    @Test
    fun test0Init() {
        try {
            createAll(folder).forEach { it.run() }
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
            val r = createFromFile("$folder/$ROBOT_FILE", 1, times = 1000)
            r.exec(ROBOT_CMD_START, """{"missionid": "$MISSION_ID"}""")
            r.run()
            khttp.async.patch("${ORION_URL}entities/${ROBOT_ID}/attrs?options=keyValues", mapOf(CONTENTTYPE), data = """{"$CMD": {"$ROBOT_CMD_PAUSE" : {}}}""", onResponse = {
                waitFor(r, STATUS.OFF)
                khttp.async.patch("${ORION_URL}entities/${ROBOT_ID}/attrs?options=keyValues", mapOf(CONTENTTYPE), data = """{"$CMD": {"$ROBOT_CMD_RESUME" : {}}}""", onResponse = {
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

    fun waitDevice(d: Device, sleep: Long = 100): String {
        var s = "foo"
        var i = 0
        println("Waiting for ${d.id}")
        while (!s.contains(d.id) && i++ <= 50) {
            if (i > 1) {
                Thread.sleep(sleep)
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

            // Test FTP
            upload(camera, async = false)
            // val uploaded = upload(camera, async = false)
            // val ftpClient = createFTPClient()
            // val outputStream1: OutputStream = BufferedOutputStream(FileOutputStream(File("src/main/resources/foo")))
            // assertTrue(ftpClient.retrieveFile(uploaded[0], outputStream1))
            // outputStream1.close()
            // ftpClient.disconnect()
            // Test HTTP (not working anymore, the image is written locally, and mapped to the web server through docker mounts
            // ... and not FTP containers
            // URL("http://" + dotenv["IMAGESERVER_IP"] + ":" + dotenv["IMAGESERVER_PORT_HTTP_EXT"]).openStream().use {
            //     var itemCount = 0
            //     val br = BufferedReader(InputStreamReader(it))
            //     var line: String?
            //     while (br.readLine().also { line = it } != null) {
            //         if (line!!.contains("<a href")) itemCount++
            //     }
            //     assertTrue(itemCount > 1) // the page also contains <a href="../">../</a>
            // }
            // Test update of the URL. NO, the URL is not uploaded in FIWARE
            // val t = waitDevice(e, 1000L)
            // val obj = JSONArray(t).getJSONObject(0)
            // assertTrue(obj.getString(IMAGE_URL).contains(dotenv["IMAGESERVER_IP"]), obj.getString(IMAGE_URL))
            // assertTrue(obj.has(TIMESTAMP))
            // assertEquals(khttp.get(obj.getString(IMAGE_URL)).statusCode, 200)
        } catch (e: Exception) {
            e.printStackTrace()
            fail(e.message)
        }
    }

    @Test
    fun testMqttCommand() {
        try {
            val d = init()
            val s = waitDevice(d)
            assertTrue(s.contains(d.id))
            assertTrue(d.status == STATUS.ON)
            khttp.async.patch("${ORION_URL}entities/${d.id}/attrs?options=keyValues", mapOf(CONTENTTYPE), data = """{"$CMD": {"off" : {}}}""", onResponse = {
                waitFor(d, STATUS.OFF)
                khttp.async.patch("${ORION_URL}entities/${d.id}/attrs?options=keyValues", mapOf(CONTENTTYPE), data = """{"$CMD": {"on" : {}}}""", onResponse = {
                    waitFor(d, STATUS.ON)
                })
            })
        } catch (e: Exception) {
            e.printStackTrace()
            fail(e.message)
        }
    }
}
