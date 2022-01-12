from kafka import KafkaProducer, KafkaConsumer, TopicPartition
from json import dumps, loads
from dotenv import dotenv_values
import sys
import uuid
import requests
from time import sleep

domain = "domain{}".format(str(uuid.uuid4())[:8])
mission = "mission{}".format(str(uuid.uuid4())[:8])

domainManagerTopic = "service.domainmanager"
missionManagerTopic = "service.missionmanager"

# import .env file
config = dotenv_values("../.env")

#setup kafka producer
connection_string = config["KAFKA_IP"] + ":" + config["KAFKA_PORT_EXT"]
print(connection_string)

producer = KafkaProducer(
  bootstrap_servers=[connection_string],
  value_serializer=lambda x: dumps(x).encode('utf-8')
)

# test domanin manager
consumerDomainManager = KafkaConsumer(
     domainManagerTopic,
     bootstrap_servers=[connection_string],
     auto_offset_reset='latest',
     enable_auto_commit=True,
     group_id='fiware-demo-testing',
     value_deserializer=lambda x: loads(x.decode('utf-8')))
consumerDomainManager.poll()
consumerDomainManager.seek_to_end() #move to the end of the topic

command = {
  "type": "request",
  "command": "create",
  "domain": domain
}
producer.send(domainManagerTopic, command).get(timeout=60)
msg = next(consumerDomainManager)
assert(msg.value["type"] == "response")
assert(msg.value["status"] == "created")
assert(msg.value["domain"] == domain)
assert(msg.value["topic"] == "data.{}.realtime".format(domain))
print("DomainManager OK!")

# Test mission manager
consumerMissionManager = KafkaConsumer(
     missionManagerTopic,
     bootstrap_servers=[connection_string],
     auto_offset_reset='latest',
     enable_auto_commit=True,
     group_id='fiware-demo-testing-mission',
     value_deserializer=lambda x: loads(x.decode('utf-8')))
consumerMissionManager.poll()
consumerMissionManager.seek_to_end() #move to the end of the topic


command = {
  "type": "request",
  "command": "start",
  "mission": mission,
  "domain": domain
}
producer.send(missionManagerTopic, command)
msg = next(consumerMissionManager)
assert(msg.value["type"] == "response")
assert(msg.value["status"] == "created")
assert(msg.value["domain"] == domain)
assert(msg.value["mission"] == mission)
assert(msg.value["domain_topic"] == "data.{}.realtime".format(domain))
assert(msg.value["mission_topic"] == "data.{}.realtime.{}".format(domain, mission))
print("MissionManager OK, mission started")

# test devices
print("Sleep 600s, wait for devices to be up and running")
sleep(600)

headers = {
  'fiware-service': 'openiot',
  'fiware-servicepath': '/'
}
response = requests.request("GET", "http://{}:{}/v2/entities/urn:ngsi-ld:thermometer:1{}?options=keyValues".format(config["ORION_IP"], config["ORION_PORT_EXT"], mission), headers=headers, data={})
responseBody = loads(response.text)
assert(response.status_code == 200)
assert(responseBody["id"] == "urn:ngsi-ld:thermometer:1{}".format(mission))
assert(responseBody["type"] == "Thermometer")
assert(responseBody["Domain"] == domain)
assert(responseBody["Latitude"] > 0)
assert(responseBody["Longitude"] > 0)
assert(responseBody["Status"])
assert(responseBody["Temperature"] >= 0)
print("Therm1 OK")


#Test draco
##http://137.204.74.56:9090/nifi-api/system-diagnostics

response = requests.request("GET", "http://{}:{}/nifi-api/system-diagnostics".format(config["DRACO_IP"], config["DRACO_API_PORT"]), headers={}, data={})
assert(response.status_code == 200)

response = requests.request("GET", "http://{}:{}/v2/subscriptions".format(config["ORION_IP"], config["ORION_PORT_EXT"]), headers={'fiware-service': 'openiot', 'fiware-servicepath': '/'}, data={})
responseBody = loads(response.text)[0]
assert(response.status_code == 200)
assert(responseBody["status"] == "active")
assert(responseBody["notification"]["timesSent"] > 0)
assert(responseBody["notification"]["lastSuccessCode"] == 200)
print("Draco OK")

# test kafka data

## test domain stream
domainStreamTopic = "data.{}.realtime".format(domain)
consumerDomainStream = KafkaConsumer(
     domainStreamTopic,
     bootstrap_servers=[connection_string],
     auto_offset_reset='latest',
     enable_auto_commit=True,
     group_id='fiware-demo-testing-domain-streaming',
     value_deserializer=lambda x: loads(x.decode('utf-8')))
domainStreamPartitions = []
for partition in consumerDomainStream.partitions_for_topic(domainStreamTopic):
    domainStreamPartitions.append(TopicPartition(domainStreamTopic, partition))
offsetsDomainStream = consumerDomainStream.end_offsets(domainStreamPartitions)
sleep(2)
offsetsDomainStream1 = consumerDomainStream.end_offsets(domainStreamPartitions)
assert(offsetsDomainStream != offsetsDomainStream1)
print("Domain Stream OK")


## test mission stream
missionStreamTopic = "data.{}.realtime.{}".format(domain, mission)
consumerMissionStream = KafkaConsumer(
     missionStreamTopic,
     bootstrap_servers=[connection_string],
     auto_offset_reset='latest',
     enable_auto_commit=True,
     group_id='fiware-demo-testing-mission-streaming',
     value_deserializer=lambda x: loads(x.decode('utf-8')))
missionStreamPartitions = []
for partition in consumerDomainStream.partitions_for_topic(missionStreamTopic):
    missionStreamPartitions.append(TopicPartition(missionStreamTopic, partition))
offsetsMissionStream = consumerMissionStream.end_offsets(missionStreamPartitions)
sleep(2)
offsetsMissionStream1 = consumerMissionStream.end_offsets(missionStreamPartitions)
print(offsetsMissionStream)
print(offsetsMissionStream1)
assert(offsetsMissionStream != offsetsMissionStream1)
print("Mission Stream OK")
