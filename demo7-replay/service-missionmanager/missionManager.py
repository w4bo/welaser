from time import strftime
from json import loads, dumps
from kafka import KafkaConsumer, KafkaProducer
import os

TOPIC = "service.missionmanager"
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
  TOPIC,
  bootstrap_servers=[KAFKA_IP + ":" + KAFKA_PORT_EXT],
  auto_offset_reset='earliest',
  enable_auto_commit=True,
  group_id='service.missionmanager',
  value_deserializer=lambda x: loads(x.decode('utf-8'))
)

def handleLaunch(missionName, domainName):
  print("launch mission", missionName, domainName)
  response = {}
  response["type"] = "response"
  response["status"] = "created"
  response["mission"] = missionName
  response["domain"] = domainName
  response["domain_topic"] = "data." + domainName + ".realtime"
  response["mission_topic"] = "data." + domainName + ".realtime." + missionName
  producer.send(TOPIC, response)
  command = "ssh {}@{} /home/{}/{}/service-missionmanager/scripts/launchMission1.sh {} {} {} &".format(USER, IP, USER, CODE_FOLDER, missionName, domainName, CODE_FOLDER)
  os.system(command)
  print(command)

def handleStop(missionName):
  print("stop mission", missionName)
  command = "ssh {}@{} /home/{}/{}/service-missionmanager/scripts/stopMission1.sh {} &".format(USER, IP, USER, CODE_FOLDER, missionName)
  os.system(command)
  print(command)
  response = {}
  response["type"] = "response"
  response["status"] = "deleted"
  response["mission"] = missionName
  producer.send(TOPIC, response)

for message in consumer:
  if message.value["type"] == "request":
    if message.value["command"] == "start":
      handleLaunch(message.value["mission"], message.value["domain"])
    elif message.value["command"] == "stop":
      handleStop(message.value["mission"])
