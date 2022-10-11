import json
import os
import time
import uuid
from kafka import KafkaConsumer
from pymongo import MongoClient

time.sleep(30)  # sleep for kafka
KAFKA_IP = os.getenv("KAFKA_IP")
KAFKA_PORT = os.getenv("KAFKA_PORT_EXT")
DRACO_PORT = os.getenv("DRACO_PORT_EXT")
DRACO_RAW_TOPIC = os.getenv("DRACO_RAW_TOPIC")
MONGO_IP = os.getenv("MONGO_DB_PERS_IP")
MONGO_PORT = os.getenv("MONGO_DB_PERS_PORT_EXT")
MONGO_CONNECTION_STR = "mongodb://{}:{}".format(MONGO_IP, MONGO_PORT)
consumer = KafkaConsumer(  # create a Kafka consumer
    group_id="writetomongo." + str(uuid.uuid1()),
    bootstrap_servers=[KAFKA_IP + ":" + KAFKA_PORT],
    value_deserializer=lambda x: json.loads(x.decode('utf-8'))
)
topic = "^" + DRACO_RAW_TOPIC + "*"
print("Subscribing to: " + topic)
consumer.subscribe(pattern=topic)  # register to all topics beginning with DRACO_RAW_TOPIC
client = MongoClient(MONGO_CONNECTION_STR)  # connect to mongo
print("Connected to mongo at: " + MONGO_CONNECTION_STR)
for message in consumer:
    message = message.value
    message["timestamp_kafka"] = time.time()
    # create a collection for every domain (e.g., Agrifarm)
    client[os.getenv("MONGO_DB_PERS_DB")].get_collection(message["domain"]).insert_one(message)
