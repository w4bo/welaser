package it.unibo.devices

import it.unibo.*
import org.apache.commons.io.IOUtils
import org.json.JSONArray
import org.json.JSONObject
import java.util.*
import kotlin.random.Random


/**
 * A camera
 */
class Camera(val onBoard: Boolean = true) : ISensor {
    override fun getType(): EntityType = EntityType.Image
    var i = 0
    var max = 7

    /**
     * @return get an image from src/main/resources, the image is encoded in Base64
     */
    @Synchronized
    override fun sense(): Any {
        val filename = /* if (onBoard) { "/img0" } else { "/field0" } */ "/field0" + (i++ % max + 1) + ".png"
        val inputstream = Camera::class.java.getResourceAsStream(filename)
        return Base64.getEncoder().encodeToString(IOUtils.toByteArray(inputstream)).replace("=", "%3D")
    }
}

/** A dummy sensor */
class DummySensor : ISensor {
    override fun getType(): EntityType = EntityType.Dummy
    override fun sense() = "foo"
}

/**
 * A thermometer
 */
class RandomSensor(val from: Int = 10, val to: Int = 30) : ISensor {
    override fun getType(): EntityType = EntityType.Thermometer

    /**
     * @return a random temperature value
     */
    override fun sense(): Any {
        return "" + Random.nextInt(from, to)
    }
}

/**
 * A heartbeat
 */
class Heartbeat(val timestamp: Boolean = false) : ISensor {
    override fun getType(): EntityType = if (timestamp) EntityType.Timestamp else EntityType.Heartbeat
    override fun sense(): Any {
        return if (timestamp) ("" + System.currentTimeMillis()) else "live"
    }
}

/**
 * An aggregate sensor
 */
class AggSensor: ISensor {
    override fun getType(): EntityType = EntityType.AggDevice
    override fun sense(): Any {
        val ret = JSONArray()
        listOf("CO2", "Temperature").forEach { s ->
            (0.. 3).forEach {
                val o = JSONObject()
                o.put((DEVICE + ID).lowercase(), "urn:ngsi-ld:Device:$s$it")
                o.put(NAME, "$s h${it}0")
                o.put(CONTROLLED_PROPERTY, JSONArray("[$s]"))
                o.put(VALUE, JSONArray("[${r.nextInt(30)}]"))
                ret.put(o)
            }
        }

        return ret
    }
}
