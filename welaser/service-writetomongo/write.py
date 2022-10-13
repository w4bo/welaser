import json
import os
import time
from kafka import KafkaConsumer
from pymongo import MongoClient
from dotenv import load_dotenv

path1 = "../.env"
if os.path.isfile(path1):
    load_dotenv(path1)

KAFKA_IP = os.getenv("KAFKA_IP")
KAFKA_PORT = os.getenv("KAFKA_PORT_EXT")
DRACO_PORT = os.getenv("DRACO_PORT_EXT")
DRACO_RAW_TOPIC = os.getenv("DRACO_RAW_TOPIC")
MONGO_IP = os.getenv("MONGO_DB_PERS_IP")
MONGO_PORT = os.getenv("MONGO_DB_PERS_PORT_EXT")
MONGO_CONNECTION_STR = "mongodb://{}:{}".format(MONGO_IP, MONGO_PORT)
consumer = KafkaConsumer(  # create a Kafka consumer
    group_id="writetomongo",
    bootstrap_servers=[KAFKA_IP + ":" + KAFKA_PORT],
    auto_offset_reset='earliest',
    enable_auto_commit=True,
    value_deserializer=lambda x: json.loads(x.decode('utf-8'))
)
topic = "^" + DRACO_RAW_TOPIC + "*"
print("Subscribing to: " + topic)
consumer.subscribe(pattern=topic)  # register to all topics beginning with DRACO_RAW_TOPIC
client = MongoClient(MONGO_CONNECTION_STR)  # connect to mongo
print("Connected to mongo at: " + MONGO_CONNECTION_STR)
messages = []
message = {}
start = round(time.time() * 1000)
while len(messages) == 0:
    messages = consumer.poll(timeout_ms=5000, max_records=1)
    if len(messages) == 0:
        consumer.unsubscribe()
        consumer.subscribe(pattern=topic)
        print("Resubscribing to: " + topic)
    else:
        received_message = True
        assert len(messages) == 1
        for x, v in messages.items():
            message = v[0].value
print("First message received in", round(time.time() * 1000) - start)
collection = client[os.getenv("MONGO_DB_PERS_DB")].get_collection(message["domain"])
collection.insert_one(message)
for message in consumer:
    message = message.value
    message["timestamp_kafka"] = round(time.time() * 1000)  # time in ms
    # create a collection for every domain (e.g., Agrifarm)
    collection.insert_one(message)
