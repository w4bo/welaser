import json
import os
import sys
import time
import uuid
from dotenv import load_dotenv
from kafka import KafkaConsumer
from kafka import KafkaProducer

path1 = "../.env"
path2 = ".env"
if os.path.isfile(path1):
    load_dotenv(path1)
elif os.path.isfile(path2):
    load_dotenv(path2)

KAFKA_IP = os.getenv('KAFKA_IP')
KAFKA_PORT = os.getenv('KAFKA_PORT_EXT')
topic = 'waitforkafka'
producer = KafkaProducer(
    bootstrap_servers=[KAFKA_IP + ':' + KAFKA_PORT],
    value_serializer=lambda x: json.dumps(x).encode('utf-8')
)
for e in range(100):
    producer.send(topic, {})
    # print('Message:', e)
    time.sleep(0.5)
consumer = KafkaConsumer(  # create a Kafka consumer
    group_id=topic + str(uuid.uuid1()),
    bootstrap_servers=[KAFKA_IP + ':' + KAFKA_PORT],
    auto_offset_reset='earliest',
    value_deserializer=lambda x: json.loads(x.decode('utf-8'))
)
consumer.subscribe(pattern=topic)
for message in consumer:
    sys.exit(0)
