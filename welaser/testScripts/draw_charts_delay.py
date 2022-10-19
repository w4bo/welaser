import json
import math
import matplotlib.pyplot as plt
import pandas as pd
import pymongo
import sys
from dotenv import dotenv_values

conf = dotenv_values("../.env")
client = pymongo.MongoClient(conf["MONGO_DB_PERS_IP"], int(conf["MONGO_DB_PERS_PORT_EXT"]))
print(conf["MONGO_DB_PERS_IP"] + ":" + conf["MONGO_DB_PERS_PORT_EXT"] + " db: " + conf["MONGO_DB_PERS_DB"])
database_name = conf["MONGO_DB_PERS_DB"]
database = client[database_name]
collections = database.list_collection_names()
print(collections)
collections = sorted([x for x in collections if "TEST" in x])
assert (len(collections) > 0)

cols = 3 if len(collections) > 3 else len(collections)
rows = math.ceil(len(collections) / cols)
fig, axs = plt.subplots(rows, cols, figsize=(4 * cols, 3 * rows))
i = 0


def label(timestamp):
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
    elif rows > 1 and cols > 1:
        ax = axs[int(i / cols)][i % cols]
    else:
        ax = axs


    def round_field(field, mult):
        return {"$multiply": [{"$round": [{"$divide": [field, mult]}, 0]}, mult]}


    for timestamp in ["$timestamp_subscription", "$timestamp_kafka"]:
        print(" - " + timestamp)
        q = list(database[collection].aggregate([
            {
                "$group": {
                    "_id": {
                        "timestamp": round_field("$timestamp", 1),
                        # "size": round_field({"$bsonSize": "$$ROOT"}, 200)
                    },
                    timestamp[1:]: {"$avg": {"$subtract": [timestamp, "$timestamp"]}}
                }
            }
        ]))
        r = []
        for x in q:
            # r.append({"_id": x["_id"]["timestamp"], "size": x["_id"]["size"], timestamp[1:]: x[timestamp[1:]]})
            r.append({"_id": x["_id"]["timestamp"], timestamp[1:]: x[timestamp[1:]]})
        data = pd.DataFrame(r)
        # data = data.pivot(index='_id', columns='size', values=timestamp[1:])
        # get the parameters from the collection's name
        setup = json.loads('{"' + collection.replace("TEST--", "").replace("--", '","').replace("-", '":"') + '"}')
        data = data.sort_values(by=["_id"], axis=0)
        mint = data["_id"].min()
        duration = int(int(setup["dur"]) / 1000)
        data["_id"] = data["_id"] - mint
        data["_id"] = data["_id"].apply(lambda x: int(x / 1000))
        # data.plot.line(ax=ax, legend=False, ls="--" if "sub" in timestamp else ':')
        data.plot.line(x="_id", y=timestamp[1:], label=label(timestamp), ax=ax, legend=False)
    for a, ylabel in [(ax, "delay (ms)")]:
        # set the legend only on the first axis
        if i == 0:
            a.legend()
        # set the title of the axis
        a.set_title("$dev={},f={},msg/s={},d={}$".format(setup["dev"], setup["freq"], int(setup["freq"]) * int(setup["dev"]), duration))
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
