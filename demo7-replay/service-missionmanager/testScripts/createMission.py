from kafka import KafkaProducer
from json import dumps
from dotenv import dotenv_values
import sys


config = dotenv_values("../../.env")
print(config["KAFKA_IP"])

connection_string = config["KAFKA_IP"] + ":" + config["KAFKA_PORT_EXT"]
print(connection_string)

producer = KafkaProducer(
  bootstrap_servers=[connection_string],
  value_serializer=lambda x: dumps(x).encode('utf-8')
)
print(producer)

command = {
  "type": "request",
  "command": "start",
  "mission": sys.argv[1],
  "domain": sys.argv[2]
}

print(command)
s = producer.send("service.missionmanager", command)
result = s.get(timeout=60)
print(result)
