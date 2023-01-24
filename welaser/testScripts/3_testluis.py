import json
import requests
from dotenv import dotenv_values

conf = dotenv_values("../.env")

url = "http://{}:{}/data".format(conf["BUILDER_IP"], conf["BUILDER_PORT_EXT"])
with open('../service-mapbuilder/Maps/MapCARIds2.geojson', 'r') as f:
    response = requests.post(url, json=json.load(f))
    assert (response.status_code == 200)

url = "http://{}:{}/data".format(conf["PLANNER_IP"], conf["PLANNER_PORT_EXT"])
response = requests.post(url, json={"timestamp": 1545730073,
                                    "agrifarm_id": "urn:ngsi-ld:AgriFarm:6991ac61-8db8-4a32-8fef-c462e2369055",
                                    "from_place_id": "urn:ngsi-ld:Building:44f0a460-30ec-431c-bb22-e30d73312c52",
                                    "agriparcel_id": "urn:ngsi-ld:AgriParcel:91f492de-7ffc-46f1-b78b-46b6d222ce8b",
                                    "roundtrip_flag": "true",
                                    "agrirobot_id": "AgriRobot:9ea60389-9246-4dda-a083-3e3bcb444131"})
assert (response.status_code == 200)
