package it.unibo.devices

import org.json.JSONObject
import java.io.File
import java.net.URL
import java.util.concurrent.Executors

class EntityFIWARE(fileName: String, timeoutMs: Int, times: Int = 1000) :
    Device(false, timeoutMs, false, -1.0, -1.0, "canary", "dummy", DummySensor(), ProtocolHTTP(), times) {

    val initStatus = JSONObject(File(fileName).readLines().reduce { a, b -> a + "\n" + b })

    override var status = when (initStatus.getString("type")) {
        "Device" -> true
        "AgriRobot" -> true
        else -> false
    }

    override var moving = when (initStatus.getString("type")) {
        "Device" -> true
        "AgriRobot" -> true
        else -> false
    }

    override var s: ISensor = when (initStatus.getString("type")) {
        "Device" -> {
            if (initStatus.getJSONArray("controlledProperty").contains("image")) {
                Camera()
            } else {
                Thermometer()
            }
        }
        else -> super.s
    }

    override fun getStatus(): String {
        when (initStatus.getString("type")) {
            "Device" -> initStatus.put("value", s.sense())
            "AgriRobot" -> {
                initStatus.put("speed", Math.random())
                initStatus.put("bearing", Math.random())
                initStatus.put("heading", Math.random())
            }
        }
        return initStatus.toString()
    }

    override fun updatePosition() {
        if (moving && initStatus.has("location")) {
            val coord = initStatus.getJSONObject("location").getJSONArray("coordinates")
            val latitude = java.lang.Double.parseDouble(coord.get(0).toString()) + (r.nextDouble() - 0.5) / 100000
            val longitude = java.lang.Double.parseDouble(coord.get(1).toString()) + (r.nextDouble() - 0.5) / 100000
            initStatus.getJSONObject("location").put("coordinates", arrayListOf(latitude, longitude))
        }
    }

    override fun sense(): String {
        return """{"actionType": "update", "entities": [${getStatus()}]}"""
    }
}

fun main() {
    val loader = Thread.currentThread().contextClassLoader
    val url: URL = loader.getResource("datamodels")!!
    val path: String = url.getPath()
    val executor = Executors.newCachedThreadPool()
    File(path).listFiles().map {
        println(it)
        EntityFIWARE(it.path, 100)
    }.forEach { d ->
        executor.submit {
            d.run()
        }
    }
}