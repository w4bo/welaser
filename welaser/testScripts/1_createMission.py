from kafka import KafkaProducer, KafkaConsumer, TopicPartition
from dotenv import dotenv_values
import requests
import sys
import random
import time
from json import dumps, loads
from time import sleep
import paho.mqtt.client as mqttClient

conf = dotenv_values("../.env")
producer = KafkaProducer(
    bootstrap_servers=[conf["KAFKA_IP"] + ":" + conf["KAFKA_PORT_EXT"]],
    value_serializer=lambda x: dumps(x).encode('utf-8')
)
consumer = KafkaConsumer(
    conf["MISSION_MANAGER_TOPIC"],
    bootstrap_servers=[conf["KAFKA_IP"] + ":" + conf["KAFKA_PORT_EXT"]],
    auto_offset_reset='earliest',
    enable_auto_commit=True,
    value_deserializer=lambda x: loads(x.decode('utf-8'))
)
domain = "foo"
with open("createdomain.txt", "r") as f:
    domain = f.read()
mission = "m" + str(random.randrange(1000000) + 10)
with open("createmission.txt", "w") as f:
    f.write(mission)
command = {
    "type": "request",
    "command": "start",
    "mission": mission,
    "domain": domain
}
producer.send(conf["MISSION_MANAGER_TOPIC"], command)
for msg in consumer:
    print(msg)
    if msg.value["type"] == "response" and msg.value["domain"] == domain and msg.value["mission"] == mission:
        assert (msg.value["status"] == "created")
        assert (msg.value["domain_topic"] == "data.{}.realtime".format(domain))
        assert (msg.value["mission_topic"] == "data.{}.realtime.{}".format(domain, mission))
        break

headers = {
    'fiware-service': conf["FIWARE_SERVICE"],
    'fiware-servicepath': conf["FIWARE_SERVICEPATH"]
}

responseBody = []
robots = []
i = 0
while i < 10 and len(responseBody) == 0:
    if i > 0:
        print("Retry...")
        sleep(10)
    response = requests.request("GET", "http://{}:{}/v2/entities?options=keyValues".format(conf["ORION_IP"], conf["ORION_PORT_EXT"]), headers=headers, data={})
    assert (response.status_code == 200)
    responseBody = [x for x in loads(response.text) if "Thermometer" == x["type"] and x["Domain"] == domain and x["Mission"] == mission]
    i += 1
assert (len(responseBody) > 0)
print(responseBody)
responseBody = responseBody[0]
thermometer_id = responseBody["id"]
assert (len(thermometer_id) > 0)
# assert(responseBody["Latitude"] >= -90)
# assert(responseBody["Longitude"] >= -180)
# assert(responseBody["Status"])
# assert(int(responseBody["Temperature"]) >= 0)

received = False  # global variable for message reception


def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("connected to broker")
    else:
        print("Connection failed")


def on_message(client, userdata, message):
    print("Message received: " + str(message.payload))
    global received
    received = True


client = mqttClient.Client("python-mqtt-client")  # create new instance
client.username_pw_set(conf["MOSQUITTO_USER"], password=conf["MOSQUITTO_PWD"])
client.on_connect = on_connect
client.on_message = on_message
client.connect(conf["MOSQUITTO_IP"], port=int(conf["MOSQUITTO_PORT_EXT"]))  # connect to broker
client.loop_start()  # start the loop
client.subscribe("/" + conf["FIWARE_API_KEY"] + "/" + thermometer_id.split(":")[-1] + "/attrs")

while not received:
    time.sleep(1)

client.disconnect()
client.loop_stop()

i = 0
while i < 30 and len(robots) == 0:
    if i > 0:
        print("Retry...")
        sleep(10)
    response = requests.request("GET", "http://{}:{}/v2/entities?options=keyValues".format(conf["ORION_IP"], conf["ORION_PORT_EXT"]))
    assert (response.status_code == 200)
    print([x for x in loads(response.text) if "ROBOT" == x["type"]])
    robots = [x for x in loads(response.text) if "ROBOT" == x["type"] and "Domain" in x and x["Domain"] == domain and x["Mission"] == mission]
    i += 1
assert (len(robots) > 0)

response = requests.request("GET", "http://{}:{}/v2/subscriptions".format(conf["ORION_IP"], conf["ORION_PORT_EXT"]), headers={'fiware-service': conf["FIWARE_SERVICE"], 'fiware-servicepath': conf["FIWARE_SERVICEPATH"]}, data={})
responseBody = loads(response.text)[0]
assert (response.status_code == 200)
assert (responseBody["status"] == "active")
assert (responseBody["notification"]["timesSent"] > 0)
assert (responseBody["notification"]["lastSuccessCode"] == 200)

# test domain stream
domainStreamTopic = "data.{}.realtime".format(domain)
consumerDomainStream = KafkaConsumer(
    domainStreamTopic,
    bootstrap_servers=[conf["KAFKA_IP"] + ":" + conf["KAFKA_PORT_EXT"]],
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
assert (offsetsDomainStream != offsetsDomainStream1)

# test mission stream
missionStreamTopic = "data.{}.realtime.{}".format(domain, mission)
consumerMissionStream = KafkaConsumer(
    missionStreamTopic,
    bootstrap_servers=[conf["KAFKA_IP"] + ":" + conf["KAFKA_PORT_EXT"]],
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
assert (offsetsMissionStream != offsetsMissionStream1)
