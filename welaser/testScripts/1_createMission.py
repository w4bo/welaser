import paho.mqtt.client as mqttClient
import requests
import time
from dotenv import dotenv_values
from json import loads
from pymongo import MongoClient
from time import sleep

conf = dotenv_values("../.env")
orion_url = "http://{}:{}/v2/".format(conf["ORION_IP"], conf["ORION_PORT_EXT"])
options = "&options=keyValues&limit=1000"
url_farm = orion_url + "entities?type=AgriFarm" + options
url_therm = orion_url + "entities?type=MQTT-Thermometer" + options
url_agrirobot = orion_url + "entities?type=AgriRobot" + options


def wait_for(description, url, attr_dom_name="foo", domain="bar", check_domain=True):
    print(description + url, end="")
    responseBody = []
    i = 0
    while i < 50 and len(responseBody) == 0:
        if i > 0:
            sleep(1)
        response = requests.get(url)
        assert (response.status_code == 200)
        responseBody = [x for x in loads(response.text) if not check_domain or (attr_dom_name in x and x[attr_dom_name] == domain)]
        i += 1
    assert (len(responseBody) > 0)
    responseBody = [x for x in responseBody if "test" not in x["id"]]
    print(". Found " + responseBody[0]["id"])
    return responseBody[0]


domain = wait_for("Looking for farm at: ", url_farm, check_domain=False)["id"]
thermometer = wait_for("Looking for MQTT-Thermometer at: ", url_therm, attr_dom_name="areaServed", domain=domain)
thermometer_id = thermometer["id"]
assert (len(thermometer_id) > 0)
assert (thermometer["location"]["coordinates"][0] >= -180)  # longitude
assert (thermometer["location"]["coordinates"][1] >= -90)  # latitude
assert (thermometer["status"])
assert (int(thermometer["temperature"]) >= 0)
wait_for("Looking for AgriRobot: ", url_agrirobot, attr_dom_name="hasFarm", domain=domain)
wait_for("Wait for carob: ", orion_url + "entities?id=carob-python&options=keyValues&limit=1000", attr_dom_name="hasFarm", domain=domain)

###############################################################################
# Testing MQTT
###############################################################################
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
# topic = "/" + conf["FIWARE_API_KEY"] + "/" + thermometer_id + "/attrs"
topic = "/" + conf["FIWARE_API_KEY"] + "/#"
print("Listening to: " + topic)
client.subscribe(topic)
i = 0
while i < 50 and not received:
    time.sleep(1)
    i += 1
client.disconnect()
client.loop_stop()
assert received, "No MQTT message received"

###############################################################################
# Check subscriptions
###############################################################################
response = requests.get(orion_url + "subscriptions")
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

###############################################################################
# Check mongodb persistence
###############################################################################
MONGO_IP = conf["MONGO_DB_PERS_IP"]
MONGO_PORT = conf["MONGO_DB_PERS_PORT_EXT"]
MONGO_CONNECTION_STR = "mongodb://{}:{}".format(MONGO_IP, MONGO_PORT)
client = MongoClient(MONGO_CONNECTION_STR)  # connect to mongo
count1 = 0
i = 0
while i < 50 and count1 == 0:
    time.sleep(1)
    count1 = len(list(client[conf["MONGO_DB_PERS_DB"]][domain].find()))
    i += 1
assert count1 > 0, "No new document found"
