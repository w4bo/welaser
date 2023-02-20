@file:JvmName("WriteImages")

package it.unibo.writeimages

import io.github.cdimascio.dotenv.Dotenv
import it.unibo.AREA_SERVED
import it.unibo.DOMAIN
import it.unibo.IMAGE_URL
import it.unibo.devices.CONTENTTYPE
import it.unibo.devices.ORION_URL
import it.unibo.writetomongo.consumeFromKafka
import org.apache.commons.net.ftp.FTP
import org.apache.commons.net.ftp.FTPClient
import org.json.JSONObject
import java.net.URL
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

fun getExt(curUrl: String): String {
    return curUrl.substring(curUrl.lastIndexOf("."))
}

fun ftpImageName(obj: JSONObject, attr: String, ext: String): String {
    val id = obj.getString("id")
    val domain = if (obj.has(DOMAIN)) obj.getString(DOMAIN) else obj.getString(AREA_SERVED)
    val date = Date(System.currentTimeMillis())
    val jdf = SimpleDateFormat("yyyy-MM-dd")
    val jdf2 = SimpleDateFormat("yyyy-MM-dd-HH-mm-ss")
    return "${domain}/${id}/" + jdf.format(date) + "/" + jdf2.format(date) + "_" + id + "_" + attr + ext
}

fun upload(obj: JSONObject, async: Boolean = true): List<String> {
    val uploaded = mutableListOf<String>()
    listOf(IMAGE_URL).filter { attr -> obj.has(attr) }.forEach { attr ->
        val curUrl = obj.getString(attr)
        if (curUrl.isNotEmpty() && !curUrl.contains(dotenv["IMAGESERVER_IP"])) {
            try {
                val id = obj.getString("id")
                val filename = ftpImageName(obj, attr, getExt(curUrl))
                URL(curUrl).openStream().use {
                    val ftpClient = createFTPClient()
                    ftpClient.setFileType(FTP.BINARY_FILE_TYPE)
                    var cd = "/"
                    val dirs = filename.split('/')
                    dirs.subList(0, dirs.size - 1).filter { it.isNotEmpty() }.forEach {
                        cd += "/$it"
                        ftpClient.makeDirectory(cd)
                    }
                    val res = ftpClient.storeFile(filename, it)
                    ftpClient.logout()
                    ftpClient.disconnect()
                    if (!res) {
                        throw java.lang.IllegalArgumentException("Cannot store the file: $filename")
                    } else {
                        uploaded.add(filename)
                    }
                }
                val payload = """{"$attr": "http://${dotenv["IMAGESERVER_IP"]}:${dotenv["IMAGESERVER_PORT_HTTP_EXT"]}/${filename}"}"""
                val url = "${ORION_URL}entities/$id/attrs?options=keyValues"
                if (async) {
                    khttp.async.patch(url, mapOf(CONTENTTYPE), data = payload)
                } else {
                    val r = khttp.patch(url, mapOf(CONTENTTYPE), data = payload)
                    if (r.statusCode != 204) {
                        throw IllegalArgumentException(r.text)
                    }
                }
            } catch (e: Exception) {
                print(e.message)
                e.printStackTrace()
            }
        }
    }
    return uploaded
}

fun main() {
    val executor = Executors.newFixedThreadPool(3)
    consumeFromKafka("writeimages") { obj ->
        executor.submit { upload(obj) }
    }
}
