from kafka import KafkaProducer
from json import dumps
from dotenv import dotenv_values
import sys


config = dotenv_values("../../.env")
connection_string = config["KAFKA_IP"] + ":" + config["KAFKA_PORT_EXT"]

producer = KafkaProducer(
  bootstrap_servers=[connection_string],
  value_serializer=lambda x: dumps(x).encode('utf-8')
)
print(producer)

command = {
  "type": "request",
  "command": "create",
  "domain": sys.argv[1],
}

print(command)
s = producer.send("service.domainmanager3", command)
result = s.get(timeout=60)
print(result)
