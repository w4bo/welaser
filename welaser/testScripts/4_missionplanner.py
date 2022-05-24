from dotenv import dotenv_values
import requests
import json

conf = dotenv_values("../.env")

i = 0
responseBody = {}
url = "http://{}:{}".format(conf["PLANNER_IP"], conf["PLANNER_PORT_EXT"])
print("Planning a mission at: " + url)
while i < 50 and responseBody == {}:
    if i > 0:
        sleep(1)
    response = requests.request("POST", url)
    assert (response.status_code == 200)
    responseBody = json.loads(response.text)
    i += 1
assert(responseBody["type"] == "Task")
print("OK: plan found")
