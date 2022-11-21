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


// NB: comments from the dotenv file will be loaded as strings as well! Be careful!
val dotenv: Dotenv = Dotenv.configure().directory("./.env").load()

fun createFTPClient(): FTPClient {
    var retry = 3
    return try {
        val ftpClient = FTPClient()
        ftpClient.isRemoteVerificationEnabled = false
        ftpClient.connect(dotenv["IMAGESERVER_IP"], dotenv["IMAGESERVER_PORT_FTP21_EXT"].toInt())
        ftpClient.login(dotenv["IMAGESERVER_USER"], dotenv["IMAGESERVER_PWD"])
        ftpClient.changeWorkingDirectory("/data")
        ftpClient
    } catch (e: Exception) {
        if (retry-- > 0) {
            Thread.sleep(1000)
            println("Retrying to connect...")
            createFTPClient()
        } else {
            throw e
        }
    }
}

fun upload(obj: JSONObject, async: Boolean = true) {
    listOf(IMAGE_URL).filter { attr -> obj.has(attr) }.forEach { attr ->
        val curUrl = obj.getString(attr)
        if (curUrl.isNotEmpty() && !curUrl.contains(dotenv["IMAGESERVER_IP"])) {
            // URL(curUrl).openStream().use { Files.copy(it, Paths.get("foo.png")) }
            try {
                val id = obj.getString("id")
                val domain = if (obj.has(DOMAIN)) obj.getString(DOMAIN) else obj.getString(AREA_SERVED)
                val filename = domain + "_" +  id + "_" + System.currentTimeMillis() + "_" + attr + curUrl.substring(curUrl.lastIndexOf("."))
                URL(curUrl).openStream().use {
                    val ftpClient = createFTPClient()
                    ftpClient.setFileType(FTP.BINARY_FILE_TYPE);
                    ftpClient.storeFile(filename, it)
                    ftpClient.logout()
                    ftpClient.disconnect()
                }
                val payload = """{"$attr": "http://${dotenv["IMAGESERVER_IP"]}:${dotenv["IMAGESERVER_PORT_HTTP_EXT"]}/$filename"}"""
                val url = "${ORION_URL}entities/$id/attrs?options=keyValues"
                if (async) {
                    khttp.async.patch(url, mapOf(CONTENTTYPE), data = payload)
                } else {
                    val r = khttp.patch(url, mapOf(CONTENTTYPE), data = payload)
                    if (r.statusCode != 200) {
                        throw IllegalArgumentException(r.text)
                    }
                }
            } catch (e: Exception) {
                print(e.message)
                e.printStackTrace()
            }
        }
    }
}

fun main() {
    consumeFromKafka("writeimages") { obj ->
        upload(obj)
    }
}
