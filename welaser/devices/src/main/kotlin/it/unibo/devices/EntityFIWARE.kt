package it.unibo.devices

import org.json.JSONObject


object EntityFactory {
    fun createFromFile(fileName: String, timeoutMs: Int, times: Int = 1000): EntityFIWARE {
        val lines = this::class.java.getResourceAsStream(fileName)!!.bufferedReader().readLines().reduce { a, b -> a + "\n" + b }
        val initStatus = JSONObject(lines)
        return when (initStatus.getString("type")) {
            "AgriRobot" -> Robot(fileName, timeoutMs, times)
            else -> EntityFIWARE(fileName, timeoutMs, times)
        }
    }

    fun createAll(folder: String): List<EntityFIWARE> {
        return this::class.java.getResourceAsStream("$folder/filelist.txt")!!
            .bufferedReader()
            .readLines()
            .filter { it.endsWith("json") }
            .sorted()
            .map {
                createFromFile("$folder/$it", 1, times = 1)
            }
    }
}

class Robot(fileName: String, timeoutMs: Int, times: Int = 1000) :
    EntityFIWARE(fileName, timeoutMs, times) {

    var missionPlan: JSONObject = JSONObject()
    var coords: MutableList<Any> = mutableListOf()

    override fun getStatus(): String {
        initStatus.put("speed", Math.random())
        initStatus.put("bearing", Math.random())
        initStatus.put("heading", Math.random())
        return initStatus.toString()
    }

    fun reset() {
        status = false
        missionPlan = JSONObject()
    }

    override fun exec(commandName: String, payload: String) {
        when (commandName) {
            "start" -> {
                status = true
                val mission: String = khttp.get("$ORION_URL/v2/entities/${payload}/?options=keyValues").jsonObject.toString()
                // val mission: String = httpRequest("$ORION_URL/v2/entities/${payload}/?options=keyValues")
                missionPlan = JSONObject(mission)
                coords = missionPlan.getJSONObject("actualLocation").getJSONArray("coordinates").toList()
            }
            "stop" -> reset()
            "resume" -> status = true
            "pause" -> status = false
        }
    }

    override fun updatePosition() {
        if (coords.isNotEmpty()) {
            val c = coords.removeAt(0)
            initStatus.getJSONObject("location").put("coordinates", c)
        } else {
            reset()
        }
    }
}

open class EntityFIWARE(fileName: String, timeoutMs: Int, times: Int = 1000) :
    DeviceHTTP(false, timeoutMs, false, -1.0, -1.0, DOMAIN, MISSION, DummySensor(), times = times) {

    val initStatus = JSONObject(this::class.java.getResourceAsStream(fileName)!!.bufferedReader().readLines().reduce { a, b -> a + "\n" + b })
    val type: String = initStatus.getString("type")
    override val id = initStatus.getString("id")

    override var status = when (type) {
        "Device" -> true
        else -> false
    }

    override var moving = when (type) {
        "Device" -> true
        else -> false
    }

    override var s: ISensor = when (type) {
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

    override fun sense() = getStatus()
}