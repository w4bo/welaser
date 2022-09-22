import os
import time
from json import dumps
from kafka import KafkaProducer
from pymongo import MongoClient, ASCENDING


def send_kafka(producer, id, doc):
    doc.pop("_id")
    topic = "data.{}.replay.{}".format(MISSION_NAME, id)
    print(topic)
    producer.send(topic, doc).get(timeout=30)
    producer.flush()


if __name__ == '__main__':

    TOPIC = os.getenv("REPLAY_MANAGER_TOPIC")
    MISSION_NAME = os.getenv("MISSION_NAME")
    ID = os.getenv("ID")
    KAFKA_IP = os.getenv("KAFKA_IP")
    KAFKA_PORT_EXT = os.getenv("KAFKA_PORT_EXT")
    MONGO_IP = os.getenv("MONGO_IP")
    MONGO_PORT = os.getenv("MONGO_PORT")
    KAFKA_BROKER = KAFKA_IP + ":" + KAFKA_PORT_EXT
    MONGO_CONNECTION_STR = "mongodb://{}:{}".format(MONGO_IP, MONGO_PORT)

    producer = KafkaProducer(
        bootstrap_servers=[KAFKA_BROKER],
        value_serializer=lambda x: dumps(x).encode('utf-8')
    )

    mongoClient = MongoClient(MONGO_CONNECTION_STR)
    persistenceDB = mongoClient[os.getenv("MONGO_DB_PERS_DB")]
    missionCollection = persistenceDB["mission_" + MISSION_NAME]
    cursor = missionCollection.find({"Time.value": {"$ne": None}}).sort('Time.value', ASCENDING)

    doc = cursor.next()
    currentTime = doc["Time"]["value"]
    send_kafka(producer, ID, doc)
    while True:
        doc = cursor.next()
        time.sleep((doc["Time"]["value"] - currentTime) / 1000)
        send_kafka(producer, ID, doc)
        currentTime = doc["Time"]["value"]
