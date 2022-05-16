package it.unibo.devices

import org.junit.jupiter.api.Assertions.fail
import org.junit.jupiter.api.MethodOrderer
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.TestMethodOrder
import java.io.File
import java.net.URL

@TestMethodOrder(MethodOrderer.MethodName::class)
class EntityTest {
    val FOLDER = "datamodels"
    val loader = Thread.currentThread().contextClassLoader
    val url: URL = loader.getResource(FOLDER)!!
    val path: String = url.getPath()

    @Test
    fun testInit() {
        try {
            File(path)
                .listFiles()
                .filter { it.extension == "json" }
                .sorted()
                .forEach {
                    println(it)
                    EntityFIWARE(it.path, 1, times = 2).run()
                }
        } catch (e: Exception) {
            e.printStackTrace()
            fail(e.message)
        }
    }

    @Test
    fun testRobot() {
        try {
            val r = EntityFactory.createByType("$path/carob-123.json", 1, times = 1000)
            r.exec("running", "mission-123")
            r.run()
        } catch (e: Exception) {
            e.printStackTrace()
            fail(e.message)
        }
    }
}