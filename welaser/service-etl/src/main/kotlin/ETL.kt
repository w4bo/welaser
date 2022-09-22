import io.github.cdimascio.dotenv.Dotenv
import org.json.JSONObject
import java.io.BufferedReader
import java.io.File
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.sql.Connection
import java.sql.DriverManager
import java.sql.SQLException
import java.util.*
import java.util.stream.Stream

interface Loadable {
    fun load(from: JSONObject, to: Connection): Unit
}

val MEASUREMENT_TYPE = "measurement_type"
val MEASUREMENT = "measurement"
val ASSIGNED_DEVICE = "assigned_device"
val LOCATION = "location"
fun id(t: String) = t + "_id"
fun name(t: String) = t + "_name"
fun type(t: String) = t + "_type"

class AgriParcel: Loadable {
    override fun load(from: JSONObject, to: Connection) {
        var query = ("insert into $LOCATION(${id(LOCATION)}, ${name(LOCATION)}, ${type(LOCATION)}, polygon, raw_json) values (?, ?, ?, ?, ?)")
        var preparedStmt = to.prepareStatement(query)
        val id = from["id"].toString()
        preparedStmt.setString(1, id)
        preparedStmt.setString(2, from.optString("name", ""))
        preparedStmt.setString(3, from["type"].toString())
        preparedStmt.setString(4, from["location"].toString())
        preparedStmt.setString(5, from.toString())
        preparedStmt.execute()
        query = ("insert into isIn(location_parent, location_child) values (?, ?)")
        from.getJSONArray("hasAgriParcelChildren").forEach {
            try {
                preparedStmt = to.prepareStatement(query)
                preparedStmt.setString(1, id)
                preparedStmt.setString(2, it.toString())
                preparedStmt.execute()
            } catch (e: SQLException) {
//                e.printStackTrace()
            }
        }
        val parent = from["hasAgriParcelParent"]?.toString() ?: ""
        if (parent.isNotEmpty()) {
            query = ("insert into isIN(location_parent, location_child) values (?, ?)")
            try {
                preparedStmt = to.prepareStatement(query)
                preparedStmt.setString(1, parent)
                preparedStmt.setString(2, id)
                preparedStmt.execute()
            } catch (e: SQLException) {
//                e.printStackTrace()
            }
        }
    }
}

fun addLocation(from: JSONObject, to: Connection): String {
    var locationId = ""
    if (from.has("location")) {
        locationId = UUID.randomUUID().toString()
        val query = ("insert into $LOCATION(${id(LOCATION)}, ${name(LOCATION)}, ${type(LOCATION)}, polygon) values (?, ?, ?, ?)")
        val preparedStmt2 = to.prepareStatement(query)
        preparedStmt2.setString(1, locationId)
        preparedStmt2.setString(2, from.optString("name", null))
        preparedStmt2.setString(3, from["type"].toString())
        preparedStmt2.setString(4, from["location"].toString())
        preparedStmt2.execute()
    }
    return locationId
}

class DeviceMeasurement: Loadable {
    override fun load(from: JSONObject, to: Connection) {
        val locationId = addLocation(from, to)

        var query = ("insert into $MEASUREMENT_TYPE(${id(MEASUREMENT_TYPE)}, unit) values (?, ?)")
        var preparedStmt = to.prepareStatement(query)
        preparedStmt.setString(1, from["controlledProperty"].toString())
        preparedStmt.setString(2, from["unit"].toString())
        preparedStmt.execute()

        query = ("insert into $MEASUREMENT(${id(ASSIGNED_DEVICE)}, ${id(MEASUREMENT_TYPE)}, measurement_value, sensing_timestamp, reception_timestamp, ${id(LOCATION)}) values (?, ?, ?, ?, ?, ?)")
        preparedStmt = to.prepareStatement(query)
        preparedStmt.setString(1, from["refDevice"].toString())
        preparedStmt.setString(2, from["controlledProperty"].toString())
        preparedStmt.setString(3, from["numValue"].toString())
        preparedStmt.setLong(4, System.currentTimeMillis())
        preparedStmt.setLong(5, System.currentTimeMillis())
        preparedStmt.setString(6, locationId)
        preparedStmt.execute()
    }
}

class Device: Loadable {
    override fun load(from: JSONObject, to: Connection) {
        var props = from.getJSONArray("controlledProperty").map { it.toString() }.toList()
        var values = from["value"].toString().replace("%3B", ";").replace("%3D", "=").split(";").map { it.split("=")[1] }

        // optional measurements
        listOf("batteryLevel", "rssi").forEach {
            if (from.has(it)) {
                props += it
                values += from[it].toString()
            }
        }

        val locationId = addLocation(from, to)

        props.zip(values).forEach {
            var query = ("insert into $MEASUREMENT_TYPE(${id(MEASUREMENT_TYPE)}, unit) values (?, ?)")
            var preparedStmt = to.prepareStatement(query)
            preparedStmt.setString(1, it.first)
            preparedStmt.setString(2, "")
            preparedStmt.execute()

            query = ("insert into $MEASUREMENT(${id(ASSIGNED_DEVICE)}, ${id(MEASUREMENT_TYPE)}, measurement_value, sensing_timestamp, reception_timestamp, ${id(LOCATION)}, raw_json) values (?, ?, ?, ?, ?, ?, ?)")
            preparedStmt = to.prepareStatement(query)
            preparedStmt.setString(1, from["id"].toString())
            preparedStmt.setString(2, it.first)
            preparedStmt.setString(3, it.second)
            preparedStmt.setLong(4, System.currentTimeMillis())
            preparedStmt.setLong(5, System.currentTimeMillis())
            preparedStmt.setString(6, locationId)
            preparedStmt.setString(7, from.toString())
            preparedStmt.execute()
        }
    }
}

class AgriFarm: Loadable {
    override fun load(from: JSONObject, to: Connection) {
        var query = ("insert into $LOCATION(${id(LOCATION)}, ${name(LOCATION)}, ${type(LOCATION)}, polygon, raw_json) values (?, ?, ?, ?, ?)")
        var preparedStmt = to.prepareStatement(query)
        val id = from["id"].toString()
        preparedStmt.setString(1, id)
        preparedStmt.setString(2, from["name"].toString())
        preparedStmt.setString(3, from["type"].toString())
        preparedStmt.setString(4, from["landLocation"].toString())
        preparedStmt.setString(5, from.toString())
        preparedStmt.execute()
        query = ("insert into isIN(location_parent, location_child) values (?, ?)")
        from.getJSONArray("hasAgriParcel").forEach {
            preparedStmt = to.prepareStatement(query)
            preparedStmt.setString(1, id)
            preparedStmt.setString(2, it.toString())
            preparedStmt.execute()
        }
    }
}

fun getAllFilesInResources(): Stream<Path> {
    val projectDirAbsolutePath = Paths.get("").toAbsolutePath().toString()
    val resourcesPath = Paths.get(projectDirAbsolutePath, "/src/main/resources")
    return Files
        .walk(resourcesPath)
        .filter { item -> Files.isRegularFile(item) }
        .filter { item -> item.toString().endsWith(".json") }
}

fun main(args: Array<String>) {
    val connectionProps = Properties()
    val dotenv: Dotenv = Dotenv.configure().load()
    connectionProps.put("user", dotenv["MYSQL_USER"])
    connectionProps.put("password", dotenv["MYSQL_PWD"])
    Class.forName("com.mysql.cj.jdbc.Driver")
    val to: Connection = DriverManager.getConnection("jdbc:mysql://${dotenv["MYSQL_IP"]}:${dotenv["MYSQL_PORT"]}/${dotenv["MYSQL_DB"]}", connectionProps)
    getAllFilesInResources().forEach { load(it.toString(), to) }
}


fun load(path: String, conn: Connection) {
    val bufferedReader: BufferedReader = File(path).bufferedReader()
    val inputString = bufferedReader.use { it.readText() }
    val obj = JSONObject(inputString)
    val type = obj["type"]
    when (type) {
        "AgriFarm" -> AgriFarm().load(obj, conn)
        "AgriParcel" -> AgriParcel().load(obj, conn)
        "Device" -> Device().load(obj, conn)
        "DeviceMeasurement" -> DeviceMeasurement().load(obj, conn)
    }
}