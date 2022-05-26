from dotenv import dotenv_values
import requests
from json import loads
conf = dotenv_values("../.env")

responseBody = []
robots = []
i = 0
url = "http://{}:{}/v2/entities?id=carob-python&options=keyValues&limit=1000".format(conf["ORION_IP"], conf["ORION_PORT_EXT"])
print("Looking for carob at: " + url)
while i < 50 and len(responseBody) == 0:
    if i > 0:
        sleep(2)
    response = requests.request("GET", url)
    assert (response.status_code == 200)
    responseBody = [x for x in loads(response.text)]
    i += 1
assert (len(responseBody) > 0)
print("Done.")