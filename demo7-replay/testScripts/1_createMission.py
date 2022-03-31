from kafka import KafkaProducer
from json import dumps
from dotenv import dotenv_values
import requests
import sys
import random
import time
from json import dumps, loads

config = dotenv_values("../.env")
producer = KafkaProducer(
  bootstrap_servers=[config["KAFKA_IP"] + ":" + config["KAFKA_PORT_EXT"]],
  value_serializer=lambda x: dumps(x).encode('utf-8')
)

domain = "dummy"
mission = "m" + str(random.randrange(1000000) + 10)
with open("createmission.txt", "w") as f:
    f.write(mission)

command = {
  "type": "request",
  "command": "start",
  "mission": mission,
  "domain": domain
}

s = producer.send("service.missionmanager", command)
result = s.get(timeout=60)

time.sleep(15)

headers = {
  'fiware-service': 'openiot',
  'fiware-servicepath': '/'
}

response = requests.request("GET", "http://{}:{}/v2/entities?options=keyValues".format(config["ORION_IP"], config["ORION_PORT_EXT"]), headers=headers, data={})
assert(response.status_code == 200)
entities = [x for x in loads(response.text) if x["Domain"] == domain and x["Mission"] == mission]
assert(len(entities) > 0)