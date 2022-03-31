from time import strftime
from json import loads, dumps
from kafka import KafkaConsumer, KafkaProducer
import os

TOPIC_MM = os.getenv("MISSION_MANAGER_TOPIC")
TOPIC_DM = os.getenv("DOMAIN_MANAGER_TOPIC")
KAFKA_IP = os.getenv("KAFKA_IP")
KAFKA_PORT_EXT = os.getenv("KAFKA_PORT_EXT")
USER = os.getenv("USER")
IP = os.getenv("IP")
CODE_FOLDER = os.getenv("CODE_FOLDER")

producer = KafkaProducer(
  bootstrap_servers=[KAFKA_IP + ":" + KAFKA_PORT_EXT],
  value_serializer=lambda x: dumps(x).encode('utf-8')
)

consumer = KafkaConsumer(
  bootstrap_servers=[KAFKA_IP + ":" + KAFKA_PORT_EXT],
  auto_offset_reset='earliest',
  enable_auto_commit=True,
  value_deserializer=lambda x: loads(x.decode('utf-8'))
)
consumer.subscribe([TOPIC_DM, TOPIC_MM])

def handleLaunch(missionName, domainName):
  print("launch mission", missionName, domainName)
  response = {}
  response["type"] = "response"
  response["status"] = "created"
  response["mission"] = missionName
  response["domain"] = domainName
  response["domain_topic"] = "data." + domainName + ".realtime"
  response["mission_topic"] = "data." + domainName + ".realtime." + missionName
  producer.send(TOPIC_MM, response)
  command = "scripts/launchMission1.sh {} {} {} &".format(missionName, domainName, CODE_FOLDER)
  os.system(command)

def handleStop(missionName):
  print("stop mission", missionName)
  command = "scripts/stopMission1.sh {} &".format(missionName)
  os.system(command)
  response = {}
  response["type"] = "response"
  response["status"] = "deleted"
  response["mission"] = missionName
  producer.send(TOPIC_MM, response)

for message in consumer:
  if message.topic == TOPIC_MM:
    if message.value["type"] == "request":
      if message.value["command"] == "start":
        handleLaunch(message.value["mission"], message.value["domain"])
      elif message.value["command"] == "stop":
        handleStop(message.value["mission"])
  else:
    if message.value["type"] == "request":
      print("create domain: " + message.value["domain"])
      response = {}
      response["type"] = "response"
      response["status"] = "created"
      response["domain"] = message.value["domain"]
      response["topic"] = "data." + message.value["domain"] + ".realtime"
      producer.send(TOPIC_DM, response)