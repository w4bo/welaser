from kafka import KafkaProducer, KafkaConsumer, TopicPartition
from json import dumps, loads
from dotenv import dotenv_values
from time import sleep
import random

conf = dotenv_values("../.env")
connection_string = conf["KAFKA_IP"] + ":" + conf["KAFKA_PORT_EXT"]
consumer = KafkaConsumer(
    conf["DOMAIN_MANAGER_TOPIC"],
    bootstrap_servers=[connection_string],
    auto_offset_reset='earliest',
    enable_auto_commit=True,
    value_deserializer=lambda x: loads(x.decode('utf-8'))
)
producer = KafkaProducer(
    bootstrap_servers=[connection_string],
    value_serializer=lambda x: dumps(x).encode('utf-8')
)
i = 0
while i < 10:
    domain = "d" + str(random.randrange(1000000) + 10)
    with open("createdomain.txt", "w") as f:
        f.write(domain)
    command = {"type": "request", "command": "create", "domain": domain}
    producer.send(conf["DOMAIN_MANAGER_TOPIC"], command)
    print(command)
    i += 1
    sleep(1)
producer.close()
for msg in consumer:
    print(msg)
    if msg.value["type"] == "response" and msg.value["domain"] == domain:
        assert (msg.value["type"] == "response")
        assert (msg.value["status"] == "created")
        assert (msg.value["topic"] == "data.{}.realtime".format(domain))
        break
consumer.close()
