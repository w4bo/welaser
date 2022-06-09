package it.unibo.devices

import it.unibo.*
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

    val c = Camera(onBoard = true)
    val h = Heartbeat()
    var missionPlan: JSONObject = JSONObject()
    var coords: MutableList<Any> = mutableListOf()

    @Synchronized
    override fun getStatus(): String {
        if (status == STATUS.ON) {
            initStatus.put("speed", Math.random())
            initStatus.put("bearing", Math.random())
            initStatus.put("heading", Math.random())
            find(initStatus, "front-camera", c.sense(), prop = "serviceProvided", mod = "status")
            updatePosition()
        }
        find(initStatus, HEARTBEAT, h.sense(), prop = "serviceProvided", mod = "status")
        return initStatus.toString()
    }

    @Synchronized
    fun reset() {
        status = STATUS.OFF
        missionPlan = JSONObject()
    }

    @Synchronized
    override fun exec(commandName: String, payload: String) {
        // println(commandName)
        when (commandName) {
            ROBOT_CMD_START -> {
                status = STATUS.ON
                // TODO should be val mission: String = khttp.get("$ORION_URL/v2/entities/${payload}/?options=keyValues").jsonObject.toString()
                val mission: String = khttp.get("$ORION_URL/v2/entities/mission-123/?options=keyValues").jsonObject.toString()
                // val mission: String = httpRequest("$ORION_URL/v2/entities/${payload}/?options=keyValues")
                missionPlan = JSONObject(mission)
                coords = missionPlan.getJSONObject("actualLocation").getJSONArray("coordinates").toList()
                // println("Update coords")
            }
            ROBOT_CMD_STOP -> reset()
            ROBOT_CMD_RESUME -> status = STATUS.ON
            ROBOT_CMD_PAUSE -> status = STATUS.OFF
        }
    }

    @Synchronized
    override fun updatePosition() {
        if (coords.isNotEmpty()) {
            // println("Update")
            val c = coords.removeAt(0)
            initStatus.getJSONObject("location").put("coordinates", c)
        } else {
            reset()
        }
    }
}

fun find(initStatus: JSONObject, key: String, value: Any, prop: String = "controlledProperty", mod: String = "value") {
    val idx = initStatus.getJSONArray(prop).indexOfFirst { it.toString() == key }
    if (idx != -1) {
        initStatus.put(mod, initStatus.getJSONArray(mod).put(idx, value))
    }
}

open class EntityFIWARE(fileName: String, timeoutMs: Int, times: Int = 1000) :
    DeviceHTTP(STATUS.OFF, timeoutMs, false, -1.0, -1.0, DOMAIN, MISSION, DummySensor(), times = times) {

    val initStatus = JSONObject(this::class.java.getResourceAsStream(fileName)!!.bufferedReader().readLines().reduce { a, b -> a + "\n" + b })
    val type: String = initStatus.getString("type")
    override val id: String = initStatus.getString("id")
    val sensors: Map<String, ISensor> =
        if (initStatus.has("controlledProperty")) {
            initStatus.getJSONArray("controlledProperty").map {
                it.toString() to when (it.toString()) {
                    HEARTBEAT -> Heartbeat()
                    "temperature" -> RandomSensor()
                    "humidity" -> RandomSensor(0, 100)
                    "camera" -> Camera(onBoard = false)
                    "image" -> Camera(onBoard = false)
                    else -> throw java.lang.IllegalArgumentException("Unknown controlledProperty: $it")
                }
            }.toMap()
        } else {
            mapOf()
        }

    override var status = when (type) {
        "Device" -> STATUS.ON
        else -> STATUS.OFF
    }

    override var moving = when (type) {
        "Device" -> false
        else -> false
    }

    @Synchronized
    override fun getStatus(): String {
        when (initStatus.getString("type")) {
            "Device" -> sensors.forEach { s -> find(initStatus, s.key, s.value.sense()) }
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
}