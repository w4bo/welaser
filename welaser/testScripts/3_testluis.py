import json
import requests
from dotenv import dotenv_values

conf = dotenv_values("../.env")

url = "http://{}:{}/data".format(conf["BUILDER_IP"], conf["BUILDER_PORT_EXT"])
with open('../service-mapbuilder/Maps/Map_CAR.geojson', 'r') as f:
    response = requests.post(url, json=json.load(f))
    assert (response.status_code == 200), "MapBuilder: " + str(response)
print("MapBuilder is ok")

url = "http://{}:{}/data".format(conf["PLANNER_IP"], conf["PLANNER_PORT_EXT"])
response = requests.post(url, json={"timestamp":1545730073,
                                    "agrifarm_id":"urn:ngsi-ld:AgriFarm:6991ac61-8db8-4a32-8fef-c462e2369055", 
                                    "from_place_id":"urn:ngsi-ld:Building:dd4cf746-d622-4284-a722-538550266002",
                                    "agriparcel_id":"urn:ngsi-ld:AgriParcel:ce109a14-09a3-48a9-90e1-e76b61dee0fd", 
                                    "roundtrip_flag":"false",
                                    "agrirobot_id":"AgriRobot:9ea60389-9246-4dda-a083-3e3bcb444131"})
assert (response.status_code == 200), "MissionPlanner: " + str(response)
print("MissionPlanner is ok")

url = "http://{}:{}/data".format(conf["SUPERVISOR_IP"], conf["SUPERVISOR_PORT_EXT"])
response = requests.post(url, json={"timestamp":1545730073,
                                    "cmd":"Stop",
                                    "task_id":"urn:ngsi-ld:AgriFarm:6991ac61-8db8-4a32-8fef-c462e2369055",
                                    "agrirobot_id":"AgriRobot:9ea60389-9246-4dda-a083-3e3bcb444131"})
assert (response.status_code == 200), "MissionSupervisor: " + str(response)
print("MissionSupervisor is ok")



