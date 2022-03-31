from json import loads, dumps
from kafka import KafkaConsumer, KafkaProducer
import os
import uuid

TOPIC_MM = os.getenv("MISSION_MANAGER_TOPIC")
TOPIC_DM = os.getenv("DOMAIN_MANAGER_TOPIC")
TOPIC_RM = os.getenv("REPLAY_MANAGER_TOPIC")
KAFKA_IP = os.getenv("KAFKA_IP")
KAFKA_PORT_EXT = os.getenv("KAFKA_PORT_EXT")
USER = os.getenv("USER")
IP = os.getenv("IP")
CODE_FOLDER = os.getenv("CODE_FOLDER")
MONGO_DB_PERS_IP = os.getenv("MONGO_DB_PERS_IP")
MONGO_DB_PERS_PORT_EXT = os.getenv("MONGO_DB_PERS_PORT_EXT")

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
consumer.subscribe([TOPIC_DM, TOPIC_MM, TOPIC_RM])

def start_mission(missionName, domainName):
  print("launch mission", missionName, domainName)
  response = {}
  response["type"] = "response"
  response["status"] = "created"
  response["mission"] = missionName
  response["domain"] = domainName
  response["domain_topic"] = "data." + domainName + ".realtime"
  response["mission_topic"] = "data." + domainName + ".realtime." + missionName
  producer.send(TOPIC_MM, response).get(timeout=30)
  command = "scripts/launchMission.sh {} {} {} &".format(missionName, domainName, CODE_FOLDER)
  os.system(command)

def stop_mission(missionName):
  print("stop mission", missionName)
  command = "scripts/stopMission.sh {} &".format(missionName)
  os.system(command)
  response = {}
  response["type"] = "response"
  response["status"] = "deleted"
  response["mission"] = missionName
  producer.send(TOPIC_MM, response).get(timeout=30)

def start_replay(missionName):
  print("start replay", missionName)
  UUID = str(uuid.uuid4())[:8]
  command = "scripts/launchReplay.sh {} {} {} {} {} {}".format(missionName, UUID, KAFKA_IP, KAFKA_PORT_EXT, MONGO_DB_PERS_IP, MONGO_DB_PERS_PORT_EXT)
  os.system(command)
  response = {}
  response["type"] = "response"
  response["status"] = "created"
  response["replay"] = "{}.{}".format(missionName, UUID)
  response["topic"] = "data.{}.replay.{}".format(missionName, UUID)
  producer.send(TOPIC_RM, response).get(timeout=30)

def stop_replay(replayName):
  print("start replay", replayName)
  command = "scripts/stopReplay.sh {}".format(replayName)
  os.system(command)
  response = {}
  response["type"] = "response"
  response["status"] = "deleted"
  response["replay"] = replayName
  producer.send(TOPIC_RM, response).get(timeout=30)

for message in consumer:
  if message.topic == TOPIC_MM:
    if message.value["type"] == "request":
      if message.value["command"] == "start":
        start_mission(message.value["mission"], message.value["domain"])
      elif message.value["command"] == "stop":
        stop_mission(message.value["mission"])
  elif message.topic == TOPIC_DM:
    if message.value["type"] == "request":
      print("create domain: " + message.value["domain"])
      response = {}
      response["type"] = "response"
      response["status"] = "created"
      response["domain"] = message.value["domain"]
      response["topic"] = "data." + message.value["domain"] + ".realtime"
      producer.send(TOPIC_DM, response).get(timeout=30)
  else:
    if message.value["type"] == "request":
      if message.value["command"] == "start":
        start_replay(message.value["mission"])
      elif message.value["command"] == "stop":
        stop_replay(message.value["replay"])
