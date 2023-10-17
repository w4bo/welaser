@file:JvmName("WriteImages")

package it.unibo.writeimages

import io.github.cdimascio.dotenv.Dotenv
import it.unibo.*
import it.unibo.writetomongo.consumeFromKafka
import org.apache.commons.net.ftp.FTP
import org.apache.commons.net.ftp.FTPClient
import org.json.JSONObject
import java.io.File
import java.net.URL
import java.nio.file.Files
import java.nio.file.Paths
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.Executors


// NB: comments from the dotenv file will be loaded as strings as well! Be careful!
val dotenv: Dotenv = Dotenv.configure().directory("./.env").load()

fun createFTPClient(retry: Int = 3): FTPClient {
    return try {
        val ftpClient = FTPClient()
        ftpClient.isRemoteVerificationEnabled = false
        ftpClient.connect(dotenv["IMAGESERVER_IP"], dotenv["IMAGESERVER_PORT_FTP21_EXT"].toInt())
        ftpClient.login(dotenv["IMAGESERVER_USER"], dotenv["IMAGESERVER_PWD"])
        ftpClient.enterLocalPassiveMode()
        // ftpClient.changeWorkingDirectory("/data")
        ftpClient
    } catch (e: Exception) {
        if (retry > 0) {
            e.printStackTrace()
            Thread.sleep(1000)
            println("Retrying to connect...")
            createFTPClient(retry - 1)
        } else {
            throw e
        }
    }
}

/**
 * Return the extension if known
 * E.g., it should return no extension for URLs like http://81.60.229.210:12356/snapshot?topic%3D/front_camera_rgb
 */
fun getExt(curUrl: String): String {
    val knownExts = listOf("jpg", "png", "tif", "svg", "gif")
    val ext = curUrl.substring(curUrl.lastIndexOf(".") + 1)
    return if (knownExts.contains(ext)) ".$ext" else ""
}

fun ftpImageName(obj: JSONObject, attr: String, ext: String): String {
    val id = obj.getString("id")
    val domain = if (obj.has(DOMAIN)) obj.getString(DOMAIN) else obj.getString(AREA_SERVED)
    val date = if (obj.has(TIMESTAMP_SUBSCRIPTION)) obj.getLong(TIMESTAMP_SUBSCRIPTION) else Date(System.currentTimeMillis())
    val jdf = SimpleDateFormat("yyyy-MM-dd")
    val jdf2 = SimpleDateFormat("yyyy-MM-dd-HH-mm-ss-SSSZ")
    return "${domain}/${id}/" + jdf.format(date) + "/" + jdf2.format(date) + "_" + id + "_" + attr + ext
}

fun upload(obj: JSONObject, async: Boolean = true): List<String> {
    val uploaded = mutableListOf<String>()
    listOf(IMAGE_URL).filter { attr -> obj.has(attr) }.forEach { attr ->
        val curUrl = obj.getString(attr)
        if (curUrl.isNotEmpty() && !curUrl.contains(dotenv["IMAGESERVER_IP"])) {
            try {
                // val id = obj.getString("id")
                // println("Received")
                val filename = ftpImageName(obj, attr, getExt(curUrl))
                val path = "resources/ftpimages/$filename"
                URL(curUrl).openStream().use {
                    val file = File(path)
                    File(path.split("/").dropLast(1).joinToString("/")).mkdirs()
                    file.createNewFile()
                    file.outputStream().use { output ->
                        it.copyTo(output)
                    }
                }
                // DO NOT UPDATE THE ENTITY ON FIWARE, the entity will be uploaded not on fiware but on the historic data
                // by write to mongo. This is necessary to avoid burdening the OCB with unnecessary data. Also, if this process
                // is slower than then GUI, then on the GUI the user will perceive delayed image updates (e.g., the user is seeing image#10,
                // but then it receives an update for image#4
                // val payload = """{"$attr": "http://${dotenv["IMAGESERVER_IP"]}:${dotenv["IMAGESERVER_PORT_HTTP_EXT"]}/${filename}"}"""
                // val url = "${ORION_URL}entities/$id/attrs?options=keyValues"
                // if (async) {
                //     khttp.async.patch(url, mapOf(CONTENTTYPE), data = payload)
                // } else {
                //     val r = khttp.patch(url, mapOf(CONTENTTYPE), data = payload)
                //     if (r.statusCode != 204) {
                //         throw IllegalArgumentException(r.text)
                //     }
                // }
            } catch (e: Exception) {
                print(e.message)
                e.printStackTrace()
            }
        }
    }
    return uploaded
}

fun main() {
    val executor = Executors.newCachedThreadPool()
    consumeFromKafka("writeimages") { obj ->
        executor.submit { upload(obj) }
    }
}
