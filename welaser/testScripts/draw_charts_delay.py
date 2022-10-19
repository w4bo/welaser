# coding: utf-8
# In[1]:

import json
import math
import sys

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import pymongo
from dotenv import dotenv_values

conf = dotenv_values("../.env")
client = pymongo.MongoClient(conf["MONGO_DB_PERS_IP"], int(conf["MONGO_DB_PERS_PORT_EXT"]))
print(conf["MONGO_DB_PERS_IP"] + ":" + conf["MONGO_DB_PERS_PORT_EXT"] + " db: " + conf["MONGO_DB_PERS_DB"])
database_name = conf["MONGO_DB_PERS_DB"]
database = client[database_name]
collections = sorted(["mission_dummy"])
assert (len(collections) > 0)
# In[2]:

cols = 3 if len(collections) > 3 else len(collections)
rows = math.ceil(len(collections) / cols)
fig, axs = plt.subplots(rows, cols, figsize=(4 * cols, 3 * rows))
fig2, axs2 = plt.subplots(rows, cols, figsize=(4 * cols, 3 * rows))
i = 0


def label(timestamp):
    if timestamp == "$timestamp_subscription":
        return "OCB-Sub"
    if timestamp == "$timestamp_kafka":
        return "Kafka"
    if timestamp == "$timestamp_iota.value":
        return "IoTA"


for collection in collections:
    print(collection + "...")
    if rows == 1 and cols > 1:
        ax = axs[i % cols]
        ax2 = axs2[i % cols]
    elif rows > 1 and cols > 1:
        ax = axs[int(i / cols)][i % cols]
        ax2 = axs2[int(i / cols)][i % cols]
    else:
        ax = axs
        ax2 = axs2

    def round_field(field, round):
        return {"$multiply": [{"$round": [{"$divide": [field, round]}, 0]}, 1000 * round]}

    for timestamp in ["$timestamp_subscription", "$timestamp_kafka"]:
        print(" - " + timestamp)
        q = list(database[collection].aggregate([
            {
                "$match": {
                    "id": "urn:ngsi-ld:AgriRobot:Test9ea60389-9246-4dda-a083-3e3bcb444131"
                }
            },
            {
                "$group": {
                    "_id": round_field({"$arrayElemAt": ["$status.value", 2]}, 1),
                    timestamp[1:]: {
                        "$avg": {
                            "$subtract": [timestamp, {"$arrayElemAt": ["$status.value", 2]}]
                        }
                    }
                }
            }
        ]))
        data = pd.DataFrame(q)
        # get the parameters from the collection's name
        setup = ""
        print(data)
        data = data.sort_values(by=["_id"], axis=0)
        data.plot.line(x="_id", y=timestamp[1:], label=label(timestamp), ax=ax, legend=False)
    for a, ylabel in [(ax, "delay (s)")]:
        # set the legend only on the first axis
        if i == 0:
            a.legend()
        # set the title of the axis
        # a.set_title("$dev={},f={},msg/s={},d={}$".format(setup["dev"], setup["freq"], int(setup["freq"]) * int(setup["dev"]), duration))
        # set the y and x ticks
        a.yaxis.set_tick_params(labelbottom=True)
        a.set_axisbelow(True)
        a.set_xlabel('Time (s)')
        a.set_ylabel(ylabel)
        # show the grid
        a.grid(visible=True, which='major', linestyle='-', axis='y')
    i += 1
for f, name in [(fig, "delay")]:
    f.tight_layout()
    f.savefig(name + ".pdf")
    f.savefig(name + ".svg")
sys.exit(0)
