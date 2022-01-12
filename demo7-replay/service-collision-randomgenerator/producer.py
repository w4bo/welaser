import random
import time
from kafka import KafkaProducer
from json import dumps
import os
from dotenv import dotenv_values

config = dotenv_values("../.env")

def current_milli_time():
    return round(time.time() * 1000)

"""
Retruns a new location
"""
def generateRandomLocation(lat1, lon1, lat2, lon2):
  return (random.uniform(lat1, lat2), random.uniform(lon1, lon2))

connection_string = "{}:{}".format(config["KAFKA_IP"], config["KAFKA_PORT_EXT"])
print(connection_string)

producer = KafkaProducer(
  bootstrap_servers=[connection_string],
  value_serializer=lambda x: dumps(x).encode('utf-8')
)
print(producer)

command = ""
while command != "quit":
  command = input("press enter to generate a collision, type 'quit' to exit. ")
  if (command != "quit"):
    current_time = current_milli_time()
    print("generate collision")
    result = {
      "id": "Analytics:Collision:" + str(current_time) + "" +str(random.uniform(0, current_time)),
      "type": "Analytics:Collision",
      "distance":{
        "type":"Float",
        "value":"10"
      },
      "time":{
        "type":"Integer",
        "value": current_time
      },
      "Mission":{
        "type":"String",
        "value":"test1"
      },
      "Device1_ID":{
        "type":"String",
        "value":"device1_id"
      },
      "Device1_latitude":{
        "type":"Float",
        "value":random.uniform(40.3121039564144, 40.31302176784392)
      },
      "Device1_longitude":{
        "type":"Float",
        "value":random.uniform(-3.48139875296614, -3.4804114278118843)
      },
      "Device1_timestamp":{
        "type":"Integer",
        "value":current_time
      },
      "Device2_ID":{
        "type":"String",
        "value":"device2_id"
      },
      "Device2_latitude":{
        "type":"Float",
        "value":random.uniform(44.832261997536214, 43.188585665425165)
      },
      "Device2_longitude":{
        "type":"Float",
        "value":random.uniform(10.363249788884543, 13.065550959816433)
      },
      "Device2_timestamp":{
        "type":"Integer",
        "value":current_time
      }
    }
    print(result)
    producer.send('data.collision', result)
