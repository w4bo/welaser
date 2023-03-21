from dotenv import dotenv_values
from json import loads
import requests
import time
conf = dotenv_values("../.env")

dict = {}
m, i = -1, 0
url = "http://{}:{}/v2/entities?q=createdBy==MQTT&options=keyValues&limit=1000".format(conf["ORION_IP"], conf["ORION_PORT_EXT"])
print("Looking for at least 5 pings from MQTT Thermometer at: " + url)
while i < 180 and m < 5:
    if i > 0:
        time.sleep(1)
    response = requests.request("GET", url)
    assert (response.status_code == 200)
    for entity in loads(response.text):
        id = entity["id"]
        dict[id] = list(set((dict[id] if id in dict else []) + [entity["timestamp"]]))
        m = max([m, len(dict[id])])
    i += 1
assert (m >= 5)
print("Done.")