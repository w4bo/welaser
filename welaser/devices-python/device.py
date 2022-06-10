import requests
import os
from dotenv import load_dotenv, find_dotenv
import json
import time
import base64

# load the environment variables
load_dotenv(find_dotenv())

# read the initial status from file
with open("carob-1.json") as f:
    status = json.load(f)
    status["id"] = "carob-python"

# register the entity
r = requests.post(url = "http://{}:{}/v2/entities?options=keyValues".format(os.environ.get("ORION_IP"), os.environ.get("ORION_PORT_EXT")),
                  data = json.dumps(status),
                  headers = {"Content-Type": "application/json"})
print(r.text)

id = status["id"]

# updates must not contain the entity id and type
del status["id"]
del status["type"]
# updates must not contain cmd, unless I am sending a command to the robot
del status["cmd"]

# update the entity for a minute
i = 0
while i < 300:
    # sleep
    time.sleep(1)
    # update the entity status
    status["status"][2] = time.time()
    # ... and image
    with open("img01.png", "rb") as image_file:
        # You cannot send messages containing "=" to the OCB,
        # so you need to encode it using its html representation ("%3D")
        # See the encoding here: https://www.w3schools.com/tags/ref_urlencode.asp
        status["status"][1] = base64.b64encode(image_file.read())
        status["status"][1] = status["status"][1].decode('utf-8').replace("=", "%3D")

    # update the context broker
    r = requests.patch(url = "http://{}:{}/v2/entities/{}/attrs?options=keyValues".format(os.environ.get("ORION_IP"), os.environ.get("ORION_PORT_EXT"), id),
                   data = json.dumps(status),
                   headers = {"Content-Type": "application/json"})
    assert(r.status_code == 204)
    i += 1