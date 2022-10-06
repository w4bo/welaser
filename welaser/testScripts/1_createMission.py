import paho.mqtt.client as mqttClient
import random
import requests
import time
from dotenv import dotenv_values
from json import dumps, loads
from kafka import KafkaProducer, KafkaConsumer
from time import sleep

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
    assert "type" in msg.value, "No type: " + str(msg)
    # assert "domain" in msg.value, "No domain: " + str(msg)
    assert "mission" in msg.value, "No mission: " + str(msg)

    if msg.value["type"] == "response" and msg.value["status"] == "created" and msg.value["domain"] == domain and msg.value["mission"] == mission:
        assert (msg.value["domain_topic"] == "data.{}.realtime".format(domain))
        assert (msg.value["mission_topic"] == "data.{}.realtime.{}".format(domain, mission))
        print("OK: Mission created.")
        break

headers = {
#    'fiware-service': conf["FIWARE_SERVICE"],
#    'fiware-servicepath': conf["FIWARE_SERVICEPATH"]
}

responseBody = []
robots = []
i = 0
print("Looking for thermometer at: http://{}:{}/v2/entities?type=MQTT-Thermometer&options=keyValues&limit=1000".format(conf["ORION_IP"], conf["ORION_PORT_EXT"]))
while i < 50 and len(responseBody) == 0:
    if i > 0:
        sleep(2)
    response = requests.request("GET", "http://{}:{}/v2/entities?type=MQTT-Thermometer&options=keyValues&limit=1000".format(conf["ORION_IP"], conf["ORION_PORT_EXT"])) #, headers=headers, data={}
    assert (response.status_code == 200)
    responseBody = [x for x in loads(response.text) if x["domain"] == domain and x["mission"] == mission and x["location"] is not None]
    i += 1
assert (len(responseBody) > 0)
print("OK: Thermometer found")
responseBody = responseBody[0]
thermometer_id = responseBody["id"]
assert (len(thermometer_id) > 0)
assert (responseBody["location"]["coordinates"][0] >= -180)  # longitude
assert (responseBody["location"]["coordinates"][1] >= -90)  # latitude
assert (responseBody["status"])
assert (int(responseBody["temperature"]) >= 0)

received = False  # global variable for message reception


def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("OK: Connected to the MQTT broker")
    else:
        print("FAIL: Connection to the MQTT broker failed")


def on_message(client, userdata, message):
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

print("OK: MQTT message received.")

client.disconnect()
client.loop_stop()

print("Looking for robot at: http://{}:{}/v2/entities?type=ROBOT&options=keyValues&limit=1000".format(conf["ORION_IP"], conf["ORION_PORT_EXT"]))
i = 0
while i < 300 and len(robots) == 0:
    if i > 0:
        sleep(2)
    response = requests.request("GET", "http://{}:{}/v2/entities?type=ROBOT&options=keyValues&limit=1000".format(conf["ORION_IP"], conf["ORION_PORT_EXT"]))
    assert (response.status_code == 200)
    robots = [x for x in loads(response.text) if "Domain" in x and x["Domain"] == domain and x["Mission"] == mission]
    i += 1
assert (len(robots) > 0)
print("OK: Robot found")

response = requests.request("GET", "http://{}:{}/v2/subscriptions".format(conf["ORION_IP"], conf["ORION_PORT_EXT"])) # , headers={'fiware-service': conf["FIWARE_SERVICE"], 'fiware-servicepath': conf["FIWARE_SERVICEPATH"]}, data={}
responses = loads(response.text)
i = 0
for responseBody in responses:
    assert (response.status_code == 200), str(responseBody)
    assert (responseBody["status"] == "active"), str(responseBody)
    if "notification" in responseBody and "timeSent" in responseBody["notification"]:
        assert (responseBody["notification"]["timesSent"] > 0), str(responseBody)
        assert (responseBody["notification"]["lastSuccessCode"] == 200), str(responseBody)
        i += 1
assert i >= 0  # at least one notification should have the timeSent
print("OK: Subscription found")
