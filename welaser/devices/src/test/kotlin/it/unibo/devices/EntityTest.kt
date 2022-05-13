package it.unibo.devices

import org.junit.jupiter.api.Assertions.fail
import org.junit.jupiter.api.Test
import java.io.File
import java.net.URL

class EntityTest {
    @Test
    fun testInit() {
        try {
            val loader = Thread.currentThread().contextClassLoader
            val url: URL = loader.getResource("datamodels")!!
            val path: String = url.getPath()
            File(path)
                .listFiles()
                .filter { it.extension == "json" }
                .sorted()
                .forEach {
                    println(it)
                    EntityFIWARE(it.path, 1, times = 2).run()
                }
        } catch (e: Exception) {
            fail(e.message)
        }
    }
}