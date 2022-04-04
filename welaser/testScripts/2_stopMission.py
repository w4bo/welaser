from kafka import KafkaProducer
from json import dumps
from dotenv import dotenv_values
import sys

conf = dotenv_values("../.env")
connection_string = conf["KAFKA_IP"] + ":" + conf["KAFKA_PORT_EXT"]
producer = KafkaProducer(
    bootstrap_servers=[connection_string],
    value_serializer=lambda x: dumps(x).encode('utf-8')
)
mission = "foo"
with open("createmission.txt", "r") as f:
    mission = f.read()

command = {
    "type": "request",
    "command": "stop",
    "mission": mission
}
s = producer.send(conf["MISSION_MANAGER_TOPIC"], command)
result = s.get(timeout=60)
