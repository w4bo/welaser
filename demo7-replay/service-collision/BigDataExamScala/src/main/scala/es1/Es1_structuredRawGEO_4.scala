package es1

import org.apache.spark.serializer.KryoSerializer
import org.apache.spark.sql.functions.{avg, col, get_json_object}
import org.apache.spark.sql.streaming.StreamingQueryListener
import org.apache.spark.sql.streaming.StreamingQueryListener.{QueryProgressEvent, QueryStartedEvent, QueryTerminatedEvent}
import org.apache.spark.sql.{SQLContext, SparkSession, functions}
import org.datasyslab.geospark.formatMapper.GeoJsonReader
import org.datasyslab.geosparksql.utils.{Adapter, GeoSparkSQLRegistrator}
import org.datasyslab.geosparkviz.core.Serde.GeoSparkVizKryoRegistrator

import scala.io.Source

object Es1_structuredRawGEO_4 {

  def main(args: Array[String]) = {
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
    GeoSparkSQLRegistrator.registerAll(sparkSession)
    val hiveContext = sparkSession.sqlContext

    /*
    sparkSession.streams.addListener(new StreamingQueryListener() {
      override def onQueryStarted(queryStarted: QueryStartedEvent): Unit = {
        println("Query started: " + queryStarted.id)
      }

      override def onQueryTerminated(queryTerminated: QueryTerminatedEvent): Unit = {
        println("Query terminated: " + queryTerminated.id)
      }

      override def onQueryProgress(queryProgress: QueryProgressEvent): Unit = {
        println("Query made progress: " + queryProgress.progress)
      }
    })
    */

    program(sparkSession, hiveContext, env)
  }

  def program(session: SparkSession, context: SQLContext, env: Map[String, String]): Unit = {
    val inputStream = session
      .readStream
      .format("kafka")
      .option("kafka.bootstrap.servers", env("KAFKA_IP")+":"+env("KAFKA_PORT_EXT"))
      .option("auto.offset.reset", "latest")
      .option("enable.auto.commit", "true")
      .option("subscribe", "raw")
      .option("timestampFormat", "yyyy-MM-dd'T'hh:mm:ss:SSSSSSZ")
      .load()
    inputStream.printSchema()

    //https://stackoverflow.com/questions/57138507/how-to-get-only-values-from-kafka-sources-to-spark
    //https://sparkbyexamples.com/spark/spark-most-used-json-functions-with-examples/#get_json_object
    val df = inputStream.selectExpr("CAST(value AS STRING)")
      //in questi casi devo leggere una tupla (chiave, valore)
      .withColumn("id", functions.json_tuple(functions.col("value"), "id"))
      .withColumn("type", functions.json_tuple(functions.col("value"), "type"))
      .filter("type == 'Thermometer'")
      .withColumn("temperature", get_json_object(col("value"), "$.Temperature.value"))
      .withColumn("latitude", get_json_object(col("value"), "$.Latitude.value").cast("Double"))
      .withColumn("longitude", get_json_object(col("value"), "$.Longitude.value").cast("Double"))
      .withColumn("eventTime", get_json_object(col("value"), "$.TimeInstant.value").cast("timestamp"))
      .drop("value")
      .selectExpr("ST_Point(CAST(longitude as Decimal(24, 20)), CAST(latitude as Decimal(24,20))) as point", "id", "id", "temperature", "eventTime")
      .withWatermark("eventTime", "5 seconds")
      .createTempView("thermometers")

    /**
     * Read geojson then create dataframe and view
     */
    val inputLocation = "src/main/resources/spain.geojson" // testOut5
    val allowTopologyInvalidGeometries = false // Optional
    val skipSyntaxInvalidGeometries = true // Optional
    val municipalityRDD = GeoJsonReader.readToGeometryRDD(session.sparkContext, inputLocation, allowTopologyInvalidGeometries, skipSyntaxInvalidGeometries)
    val municipalityDF = Adapter.toDf(municipalityRDD, session)
    municipalityDF
      .selectExpr("name", "ST_GeomFromText(geometry) as geometry")
      .createOrReplaceTempView("municipality")


    /**
     * https://postgis.net/docs/ST_GeomFromText.html
     * http://sedona.incubator.apache.org/archive/api/sql/GeoSparkSQL-Predicate/#st_contains
     *
     * Infer device location from point
     */
    val joinMunicipality = context.sql(
      """
        |select M.name as location, T.id, T.temperature, t.eventTime
        |from thermometers as T, municipality as M
        |where ST_Contains(M.geometry, T.point)
        |""".stripMargin)
      .groupBy( //windowing by event time and location
        functions.window(col("eventTime"), "5 seconds") as "Time",
        col("location") as "Location"
      )
      .agg(avg("temperature") as "Temperature") //for each group, compute average temperature
      .writeStream
      .format("console")
      .option("truncate", "false")
      .outputMode("update")
      .start()
      .awaitTermination()
  }
}
