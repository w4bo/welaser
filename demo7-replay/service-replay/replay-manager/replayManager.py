from time import strftime
from json import loads, dumps
from kafka import KafkaConsumer, KafkaProducer
import os
import uuid

TOPIC = "service.replaymanager"
USER = os.getenv("USER")
IP = os.getenv("IP")
KAFKA_IP = os.getenv("KAFKA_IP")
KAFKA_PORT = os.getenv("KAFKA_PORT")
CODE_FOLDER = os.getenv("CODE_FOLDER")
MONGO_DB_PERS_IP = os.getenv("MONGO_DB_PERS_IP")
MONGO_DB_PERS_PORT_EXT = os.getenv("MONGO_DB_PERS_PORT_EXT")
KAFKA_SERVER = KAFKA_IP + ":" + KAFKA_PORT

producer = KafkaProducer(
  bootstrap_servers=[KAFKA_SERVER],
  value_serializer=lambda x: dumps(x).encode('utf-8')
)

consumer = KafkaConsumer(
  TOPIC,
  bootstrap_servers=[KAFKA_SERVER],
  auto_offset_reset='earliest',
  enable_auto_commit=True,
  group_id='service.replaymanager',
  value_deserializer=lambda x: loads(x.decode('utf-8'))
)

def handleStart(missionName):
  UUID = str(uuid.uuid4())[:8]
  command = "ssh {}@{} /home/{}/{}/service-replay/replay-manager/scripts/launchReplay.sh {} {} {} {} {} {}".format(USER, IP, USER, CODE_FOLDER, missionName, UUID, KAFKA_IP, KAFKA_PORT, MONGO_DB_PERS_IP, MONGO_DB_PERS_PORT_EXT)
  print("start replay", command)
  os.system(command)
  response = {}
  response["type"] = "response"
  response["status"] = "created"
  response["replay"] = "{}.{}".format(missionName, UUID)
  response["topic"] = "data.{}.replay.{}".format(missionName, UUID)
  producer.send(TOPIC, response)

def handleStop(replayName):
  command = "ssh {}@{} /home/{}/{}/service-replay/replay-manager/scripts/stopReplay.sh {}".format(USER, IP, USER, CODE_FOLDER, replayName)
  os.system(command)
  response = {}
  response["type"] = "response"
  response["status"] = "deleted"
  response["replay"] = replayName
  producer.send(TOPIC, response)

for message in consumer:
  if message.value["type"] == "request":
    print(message.value)
    if message.value["command"] == "start":
      handleStart(message.value["mission"])
    elif message.value["command"] == "stop":
      handleStop(message.value["replay"])
