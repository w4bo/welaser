@file:JvmName("WriteImages")

package it.unibo.writeimages

import io.github.cdimascio.dotenv.Dotenv
import it.unibo.AREA_SERVED
import it.unibo.DOMAIN
import it.unibo.IMAGE_URL
import it.unibo.writetomongo.consumeFromKafka
import org.apache.commons.net.ftp.FTP
import org.apache.commons.net.ftp.FTPClient
import org.json.JSONObject
import java.net.URL


// NB: comments from the dotenv file will be loaded as strings as well! Be careful!
val dotenv: Dotenv = Dotenv.configure().directory("./.env").load()

fun createFTPClient(): FTPClient {
    val ftpClient = FTPClient()
    ftpClient.isRemoteVerificationEnabled = false
    ftpClient.connect(dotenv["IMAGESERVER_IP"], dotenv["IMAGESERVER_PORT_FTP21_EXT"].toInt())
    ftpClient.login(dotenv["IMAGESERVER_USER"], dotenv["IMAGESERVER_PWD"])
    ftpClient.changeWorkingDirectory("/data")
    return ftpClient
}

fun upload(obj: JSONObject) {
    listOf(IMAGE_URL).filter { attr -> obj.has(attr) }.forEach { attr ->
        val curUrl = obj.getString(attr)
        if (curUrl.isNotEmpty() && !curUrl.contains(dotenv["IMAGESERVER_IP"])) {
            // URL(curUrl).openStream().use { Files.copy(it, Paths.get("foo.png")) }
            try {
                URL(curUrl).openStream().use {
                    val ftpClient = createFTPClient()
                    ftpClient.setFileType(FTP.BINARY_FILE_TYPE);
                    // val input: InputStream = BufferedInputStream(FileInputStream("foo.png"))
                    // ftpClient.storeFile(java.net.URLEncoder.encode(obj.getString("domain") + "-" + obj.getString("id") + "-" + System.currentTimeMillis() + "-" + attr + curUrl.substring(curUrl.lastIndexOf(".")), "utf-8"), input)
                    // input.close()
                    val domain = if (obj.has(DOMAIN)) obj.getString(DOMAIN) else obj.getString(AREA_SERVED)
                    ftpClient.storeFile(java.net.URLEncoder.encode(domain + "-" + obj.getString("id") + "-" + System.currentTimeMillis() + "-" + attr + curUrl.substring(curUrl.lastIndexOf(".")), "utf-8"), it)
                    ftpClient.logout()
                    ftpClient.disconnect()
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
