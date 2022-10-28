package it.unibo.devices

import it.unibo.*
import org.json.JSONObject
import java.lang.IllegalArgumentException


object EntityFactory {
    fun createFromFile(fileName: String, timeoutMs: Int, times: Int = 1000): EntityFIWARE {
        println(fileName)
        val lines = this::class.java.getResourceAsStream(fileName)!!.bufferedReader().readLines().reduce { a, b -> a + "\n" + b }
        val initStatus = JSONObject(lines)
        return when (initStatus.getString(TYPE)) {
            AGRI_ROBOT -> Robot(fileName, timeoutMs, times)
            else -> EntityFIWARE(fileName, timeoutMs, times)
        }
    }

    fun createAll(folder: String): List<EntityFIWARE> {
        return this::class.java.getResourceAsStream("$folder/filelist.txt")!!
            .bufferedReader()
            .readLines()
            .filter { it.endsWith("json") }
            .sorted()
            .map { createFromFile("$folder/$it", 1, times = 1) }
    }
}

class Robot(fileName: String, timeoutMs: Int, times: Int = 1000) : EntityFIWARE(fileName, timeoutMs, times) {

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
            initStatus.put(ERRORS, if (r.nextDouble() > 0.95) listOf("Obstacle detected") else listOf())
            initStatus.put(WARNINGS, if (r.nextDouble() > 0.90) listOf("Low connection", "Bumpy field").subList(0, r.nextInt(2) + 1) else listOf())
            updatePosition()
        }
        find(initStatus, HEARTBEAT, h.sense(), prop = "serviceProvided", mod = "status")
        initStatus.put(DOMAIN, AGRI_FARM)
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
                val pay = JSONObject(payload)
                val missionid = if (pay.has("missionid")) pay.getString("missionid") else MISSION_ID
                val mission: String = khttp.get("${ORION_URL}entities/${missionid}/?options=keyValues").jsonObject.toString()
                missionPlan = JSONObject(mission)
                coords = missionPlan.getJSONObject("actualLocation").getJSONArray(COORDINATES).toList()
                // println("Done $missionid")
            }
            ROBOT_CMD_STOP -> reset()
            ROBOT_CMD_RESUME -> status = STATUS.ON
            ROBOT_CMD_PAUSE -> status = STATUS.OFF
        }
    }

    @Synchronized
    override fun updatePosition() {
        if (coords.isNotEmpty()) {
            val c = coords.removeAt(0)
            initStatus.getJSONObject(LOCATION).put(COORDINATES, c)
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
    DeviceHTTP(STATUS.OFF, timeoutMs, false, -1.0, -1.0, AGRI_FARM, DummySensor(), times = times) {

    val initStatus = JSONObject(this::class.java.getResourceAsStream(fileName)!!.bufferedReader().readLines().reduce { a, b -> a + "\n" + b })
    val type: String = initStatus.getString(TYPE)
    override val id: String = initStatus.getString("id")
    val sensors: Map<String, ISensor> =
        if (initStatus.has("controlledProperty")) {
            initStatus.getJSONArray("controlledProperty").associate {
                it.toString() to when (it.toString().lowercase()) {
                    HEARTBEAT -> Heartbeat()
                    TIMESTAMP -> Heartbeat(timestamp = true)
                    TEMPERATURE -> RandomSensor()
                    HUMIDITY -> RandomSensor(0, 100)
                    IMAGE -> Camera(onBoard = false)
                    else -> throw IllegalArgumentException("Unknown controlledProperty: $it")
                }
            }
        } else {
            mapOf()
        }

    override var status = when (type) {
        "Device" -> STATUS.ON
        else -> STATUS.OFF
    }

    override var moving = false

    @Synchronized
    override fun getStatus(): String {
        when (initStatus.getString(TYPE)) {
            "Device" -> sensors.forEach { s -> find(initStatus, s.key, s.value.sense()) }
        }
        initStatus.put(TIMESTAMP, System.currentTimeMillis())
        initStatus.put(DOMAIN, AGRI_FARM)
        return initStatus.toString()
    }

    override fun updatePosition() {
        if (moving && initStatus.has(LOCATION)) {
            val coord = initStatus.getJSONObject(LOCATION).getJSONArray(COORDINATES)
            val latitude = java.lang.Double.parseDouble(coord.get(0).toString()) + (r.nextDouble() - 0.5) / 100000
            val longitude = java.lang.Double.parseDouble(coord.get(1).toString()) + (r.nextDouble() - 0.5) / 100000
            initStatus.getJSONObject(LOCATION).put(COORDINATES, arrayListOf(latitude, longitude))
        }
    }
}