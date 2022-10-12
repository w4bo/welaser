# coding: utf-8
# In[1]:

import json
import math
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import pymongo
import sys
from dotenv import dotenv_values

conf = dotenv_values("../.env")
client = pymongo.MongoClient(conf["MONGO_DB_PERS_IP"], int(conf["MONGO_DB_PERS_PORT_EXT"]))
database_name = conf["MONGO_DB_PERS_DB"]
database = client[database_name]
collections = database.list_collection_names()
print(collections)
collections = sorted([x for x in collections if "TEST" in x])
assert (len(collections) > 0)
# In[2]:

cols = 3 if len(collections) > 3 else len(collections)
rows = math.ceil(len(collections) / cols)
fig, axs = plt.subplots(rows, cols, figsize=(4 * cols, 3 * rows))
fig2, axs2 = plt.subplots(rows, cols, figsize=(4 * cols, 3 * rows))
i = 0


def label(timestamp):
    if timestamp == "$timestamp":
        return "Device"
    if timestamp == "$timestamp_subscription":
        return "OCB-Sub"
    if timestamp == "$timestamp_kafka":
        return "Kafka"
    if timestamp == "$timestamp_iota":
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

    mint = -1
    maxt = -1
    for timestamp in ["$timestamp", "$timestamp_subscription", "$timestamp_kafka", "$timestamp_iota"]:
        print(" - " + timestamp)
        if timestamp in ["$timestamp", "$timestamp_iota"]:  # these timestamps are in ms
            data = pd.DataFrame(list(database[collection].aggregate([{"$group": { "_id": { "$multiply" : [{ "$round" : [{ "$divide" : [ timestamp, 1000 * 10]}, 0 ]}, 1000 * 10]}, "count": { "$sum": 1 } }}])))
        else:  # these timestamps are in s, I need to round them in second and to transform them in ms
            data = pd.DataFrame(list(database[collection].aggregate([{"$group": { "_id": { "$multiply" : [{ "$round" : [{ "$divide" : [ timestamp, 10]}, 0 ]}, 1000 * 10]}, "count": { "$sum": 1 } }}])))
        # drop the null values
        data = data.dropna()
        # get the parameters from the collection's name
        setup = json.loads('{"' + collection.replace("TEST--", "").replace("--", '","').replace("-", '":"') + '"}')
        # this is the timestamp from devices
        if timestamp == "$timestamp":
            # get the first timestamp
            mint = data["_id"].min()

            # plot the optimal value (if no message is lost)
            x = np.linspace(0, np.log(int(setup["dur"]) / 1000), num=100)
            y = [step * int(setup["freq"]) * int(setup["dev"]) for step in x]
            ax2.plot(x, y, label="Optimal", ls="--")
        # shift the time values to 0
        data["_id"] = data["_id"] - mint
        duration = int(int(setup["dur"]) / 1000)
        # get the last theoretical/empirical timestamp
        maxt = max(duration, data["_id"].max() / 1000)
        data["_id"] = data["_id"].apply(lambda x: int(x / 1000))
        data = data.sort_values(by=["_id"], axis=0)
        data.plot.line(x="_id", y="count", label=label(timestamp), ax=ax, legend=False)
        data["count"] = data["count"].cumsum()
        data.plot.line(x="_id", y="count", label=label(timestamp), ax=ax2, legend=False)
    for a, ylabel in [(ax, "#msg"), (ax2, "cum #msg")]:
        # set the legend only on the first axis
        if i == 0:
            a.legend()
        # set the title of the axis
        a.set_title("$dev={},f={},msg/s={},d={}$".format(setup["dev"], setup["freq"], int(setup["freq"]) * int(setup["dev"]), duration))
        # set the y and x ticks
        a.yaxis.set_tick_params(labelbottom=True)
        a.set_axisbelow(True)
        a.set_xticks(np.linspace(0, maxt, num=5))
        a.set_xlabel('Time (s)')
        a.set_ylabel(ylabel)
        # show the grid
        a.grid(visible=True, which='major', linestyle='-', axis='y')
        a.set_yscale('log')
    i += 1
for f, name in [(fig, "scalability"), (fig2, "scalability_cum")]:
    f.tight_layout()
    f.savefig(name + ".pdf")
    f.savefig(name + ".svg")
sys.exit(0)
