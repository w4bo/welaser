from time import strftime
from json import loads, dumps
from kafka import KafkaConsumer, KafkaProducer
import os
from pymongo import MongoClient, ASCENDING
from pprint import pprint
import time

def sendKafka(producer, id, doc):
  doc.pop("_id")
  topic = "data.{}.replay.{}".format(MISSION_NAME, id)
  print(topic)
  producer.send(topic, doc).get(timeout=30)
  producer.flush()

if __name__ == '__main__':
  for k, v in sorted(os.environ.items()):
    print(k + ':' + v)
  print('\n')

  TOPIC = "service.replayexecutor"
  MISSION_NAME = os.getenv("MISSION_NAME")
  ID = os.getenv("ID")
  KAFKA_IP = os.getenv("KAFKA_IP")
  KAFKA_PORT = os.getenv("KAFKA_PORT")
  MONGO_IP = os.getenv("MONGO_IP")
  MONGO_PORT = os.getenv("MONGO_PORT")
  # MISSION_NAME = "m1"
  # ID = "632753c7"

  KAFKA_BROKER = KAFKA_IP + ":" + KAFKA_PORT
  MONGO_CONNECTION_STR = "mongodb://{}:{}".format(MONGO_IP, MONGO_PORT)

  producer = KafkaProducer(
    bootstrap_servers=[KAFKA_BROKER],
    value_serializer=lambda x: dumps(x).encode('utf-8')
  )

  mongoClient = MongoClient(MONGO_CONNECTION_STR)
  persistenceDB = mongoClient.persistence
  missionCollection = persistenceDB["mission_" + MISSION_NAME]
  cursor = missionCollection.find({"Time.value": {"$ne": None}}).sort('Time.value', ASCENDING)

  doc = cursor.next()
  currentTime = doc["Time"]["value"]
  sendKafka(producer, ID, doc)
  while True:
    doc = cursor.next()
    time.sleep((doc["Time"]["value"] - currentTime) / 1000)
    sendKafka(producer, ID, doc)
    currentTime = doc["Time"]["value"]
