package es2

import net.liftweb.json.DefaultFormats
import net.liftweb.json.Serialization.write
import org.apache.kafka.clients.producer.{KafkaProducer, ProducerRecord}
import org.apache.kafka.common.serialization.StringDeserializer
import org.apache.spark.SparkContext
import org.apache.spark.serializer.KryoSerializer
import org.apache.spark.sql.SparkSession
import org.apache.spark.streaming.kafka010.ConsumerStrategies.Subscribe
import org.apache.spark.streaming.kafka010.KafkaUtils
import org.apache.spark.streaming.kafka010.LocationStrategies.PreferConsistent
import org.apache.spark.streaming.{Seconds, StreamingContext}
import org.datasyslab.geosparkviz.core.Serde.GeoSparkVizKryoRegistrator
import org.joda.time.{DateTime, DateTimeZone}

import java.util.Properties
import scala.io.Source

object Es2_DirectStream extends App {

  //https://qastack.it/programming/27928/calculate-distance-between-two-latitude-longitude-points-haversine-formula
  def getDistanceFromLatLonInKM(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double = {
    def deg2rad(deg: Double): Double = {
      deg * (Math.PI / 180)
    }

    val R = 6371; // Radius of the earth in km
    val dLat = deg2rad(lat2 - lat1); // deg2rad below
    val dLon = deg2rad(lon2 - lon1);
    val a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
    val c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    val d = R * c; // Distance in km
    d
  }

  def getCurrentTime: Long = {
    DateTime.now(DateTimeZone.UTC).getMillis
  }

  override def main(args: Array[String]): Unit = {
    val env: Map[String, String] =
      Source
        .fromFile("config/.env")
        .getLines
        .toStream
        .filter(!_.startsWith("#"))
        .filter(_.nonEmpty)
        .map(_.split("="))
        .map(a => (a.apply(0), a.apply(1)))
        .toMap

    val sparkSession = SparkSession.builder()
      .master("local[4]") // Delete this if run in cluster mode
      .appName("unit test") // Change this to a proper name
      .config("spark.broadcast.compress", "false")
      .config("spark.shuffle.compress", "false")
      .config("spark.shuffle.spill.compress", "false")
      .config("spark.io.compression.codec", "lzf")
      .config("spark.serializer", classOf[KryoSerializer].getName) // Enable GeoSpark custom Kryo serializer
      .config("spark.kryo.registrator", classOf[GeoSparkVizKryoRegistrator].getName)
      .enableHiveSupport()
      .getOrCreate()
    sparkSession.sparkContext.setLogLevel("ERROR")

    val kafkaParams = Map[String, Object](
      "bootstrap.servers" ->  (env("KAFKA_IP") + ":" + env("KAFKA_PORT_EXT")),
      "key.deserializer" -> classOf[StringDeserializer],
      "value.deserializer" -> classOf[StringDeserializer],
      "auto.offset.reset" -> "latest",
      "group.id" -> "WeLASER-realtime-collision",
      "mode" -> "PERMISSIVE",
      "enable.auto.commit" -> (true: java.lang.Boolean),
      "auto.offset.reset" -> "latest"
    )

    val props: Properties = new Properties()
    props.put("bootstrap.servers", (env("KAFKA_IP") + ":" + env("KAFKA_PORT_EXT")))
    props.put("key.serializer",
      "org.apache.kafka.common.serialization.StringSerializer")
    props.put("value.serializer",
      "org.apache.kafka.common.serialization.StringSerializer")
    props.put("acks", "all")

    program(sparkSession.sparkContext, props, kafkaParams: Map[String, Object])
  }

  def program(sc: SparkContext, props: Properties, kafkaSubscriberParams: Map[String, Object]): Unit = {
    val ssc = new StreamingContext(sc, Seconds(3))
    val stream = KafkaUtils.createDirectStream[String, String](
      ssc,
      PreferConsistent,
      Subscribe[String, String](Array("raw"), kafkaSubscriberParams)
    )

    val LIMIT = 100

    stream
      //map message value to json
      .map(x => ujson.read(x.value()))
      //convert to key-value, mantain oly relevant data
      .map(x => (
        x("id").str,
        (x("Latitude")("value").num, x("Longitude")("value").num, x("Time")("value").num))
      )
      //for each device, mantain only most recent message
      .reduceByKey { case ((xLat, xLon, xTime), (yLat, yLon, yTime)) => if (xTime > yTime)
        (xLat, xLon, xTime) else (yLat, yLon, yTime)
      }
      //"half" cartesian product, avoid compute the same distance twice
      .transform(x => x.cartesian(x).filter { case ((idA, _), (idB, _)) => idA < idB })
      //map each message pair to distance
      .map { case ((xID, (xLat, xLon, xTime)), (yID, (yLat, yLon, yTime))) => (
        xID + "-" + yID,
        getDistanceFromLatLonInKM(xLat, xLon, yLat, yLon),
        (xID, xLat, xLon, xTime),
        (yID, yLon, yLat, yTime)
      )
      }
      .filter(_._2 < LIMIT)
      .foreachRDD { (rdd, time) => {
        rdd.foreach(record => {
          implicit val formats: DefaultFormats.type = DefaultFormats
          val producer = new KafkaProducer[String, String](props)

          val collision: String =
            s"""
              |{
              | "id": "Analytics:Collision:" + str(current_time) + "" +str(random.uniform(0, current_time)),
              | "type": "Analytics:Collision",
              | "distance":{
              |   "type":"Float",
              |   "value":${record._2}
              | },
              | "time":{
              |   "type":"Integer",
              |   "value": ${time.milliseconds}
              | },
              | "Device1_ID":{
              |   "type":"String",
              |   "value": ${record._3._1}
              | },
              | "Device1_latitude":{
              |   "type":"Float",
              |   "value": ${record._3._2}
              | },
              | "Device1_longitude":{
              |   "type":"Float",
              |   "value": ${record._3._3}
              | },
              | "Device1_timestamp":{
              |   "type":"Integer",
              |   "value": ${record._3._4}
              | },
              | "Device2_ID":{
              |   "type":"String",
              |   "value": ${record._4._1}
              | },
              | "Device2_latitude":{
              |   "type":"Float",
              |   "value": ${record._4._2}
              | },
              | "Device2_longitude":{
              |   "type":"Float",
              |   "value": ${record._4._3}
              | },
              | "Device2_timestamp":{
              |   "type":"Integer",
              |   "value": ${record._4._4}
              | }
              |}
              |""".stripMargin

          producer.send(new ProducerRecord[String, String](
            "data.collision",
            record._1,
            write(collision))
          )
        })
      }
      }

    ssc.start()
    ssc.awaitTermination()
  }
}
