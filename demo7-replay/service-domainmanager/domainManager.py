from time import strftime
from json import loads, dumps
from kafka import KafkaConsumer, KafkaProducer
import os

TOPIC = "service.domainmanager"
KAFKA_IP = os.getenv("KAFKA_IP")
KAFKA_PORT_EXT = os.getenv("KAFKA_PORT_EXT")
print(KAFKA_IP)
print(KAFKA_PORT_EXT)
print(TOPIC)

producer = KafkaProducer(
  bootstrap_servers=[KAFKA_IP + ":" + KAFKA_PORT_EXT],
  value_serializer=lambda x: dumps(x).encode('utf-8')
)

consumer = KafkaConsumer(
  TOPIC,
  bootstrap_servers=[KAFKA_IP + ":" + KAFKA_PORT_EXT],
  auto_offset_reset='earliest',
  enable_auto_commit=True,
  group_id='service.domainmanager',
  value_deserializer=lambda x: loads(x.decode('utf-8'))
)


for message in consumer:
  #print(message)
  messageValue = message.value
  print(messageValue)
  if messageValue["type"] == "request":
    print("handle request")
    response = {}
    response["type"] = "response"
    response["status"] = "created"
    response["domain"] = messageValue["domain"]
    response["topic"] = "data." + messageValue["domain"] + ".realtime"
    producer.send(TOPIC, response)
