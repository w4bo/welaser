# coding: utf-8
# In[1]:

import json
import math
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import pymongo

db_connect = pymongo.MongoClient('127.0.0.1', 37017)
database_name = 'persistence'
database = db_connect[database_name]
collections = sorted([x for x in database.list_collection_names() if "TEST" in x])

# In[2]:

cols = 3 if len(collections) > 3 else len(collections)
rows = math.ceil(len(collections) / cols)
fig, axs = plt.subplots(rows, cols, figsize=(4 * cols, 3 * rows))
fig2, axs2 = plt.subplots(rows, cols, figsize=(4 * cols, 3 * rows))
i = 0

def label(timestamp):
    if timestamp == "$timestamp.value":
        return "Device"
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

    mint = -1
    for timestamp in ["$timestamp.value", "$timestamp_subscription", "$timestamp_kafka", "$timestamp_iota.value"]:
        print(" - " + timestamp)
        if timestamp in ["$timestamp.value", "$timestamp_iota.value"]:  # these timestamps are in ms
            data = pd.DataFrame(list(database[collection].aggregate([{"$group": { "_id": { "$multiply" : [{ "$round" : [{ "$divide" : [ timestamp, 1000 * 10]}, 0 ]}, 1000 * 10]}, "count": { "$sum": 1 } }}])))
        else:  # these timestamps are in s, I need to round them in second and to transform them in ms
            data = pd.DataFrame(list(database[collection].aggregate([{"$group": { "_id": { "$multiply" : [{ "$round" : [{ "$divide" : [ timestamp, 10]}, 0 ]}, 1000 * 10]}, "count": { "$sum": 1 } }}])))
        # drop the null values
        data = data.dropna()
        # get the parameters from the collection's name
        setup = json.loads('{"' + collection.replace("mission_TEST--", "").replace("--", '","').replace("-", '":"') + '"}')
        # this is the timestamp from devices
        if timestamp == "$timestamp.value":
            # get the first timestamp
            mint = data["_id"].min()
            # plot the optimal value (if no message is lost)
            x = np.linspace(0, np.log(int(setup["dur"]) / 1000), num=100)
            y = [step * int(setup["freq"]) * int(setup["dev"]) for step in x]
            ax2.plot(x, y, label="Optimal", ls="--")
        # shift the time values to 0
        data["_id"] = data["_id"] - mint
        data["_id"] = data["_id"].apply(lambda x: int(x / 1000))
        data = data.sort_values(by=["_id"], axis=0)
        data.plot.line(x="_id", y="count", label=label(timestamp), ax=ax, legend=False)
        data["count"] = data["count"].cumsum()
        data.plot.line(x="_id", y="count", label=label(timestamp), ax=ax2, legend=False)
    for a in [ax, ax2]:
        # set the legend only on the first axis
        if i == 0:
            a.legend()
        # set the title of the axis
        a.set_title("$dev={},freq={},msg/s={}$".format(setup["dev"], setup["freq"], int(setup["freq"]) * int(setup["dev"])))
        # set the y and x ticks
        a.yaxis.set_tick_params(labelbottom=True)
        a.set_axisbelow(True)
        a.set_xlabel('Time (s)')
        # show the grid
        a.grid(visible=True, which='major', linestyle='-', axis='y')
        a.set_yscale('log')
    i += 1
for f, name in [(fig, "scalability"), (fig2, "scalability_cum")]:
    f.tight_layout()
    f.savefig(name + ".pdf")
    f.savefig(name + ".svg")
