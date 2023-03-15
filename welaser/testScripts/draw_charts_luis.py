import json
import math
import matplotlib.pyplot as plt
import pandas as pd
import pymongo
import sys
from dotenv import dotenv_values
import requests
import matplotlib.dates as md
import datetime as dt
import time

conf = dotenv_values("../.env")
fromdate = 0 # 1678273200000 2023/08/03 11:00
todate = 9999999999999 # 1678291200000 2023/08/03 16:00
timestep = 10
url = "http://{}:{}/api/stats/urn:ngsi-ld:AgriFarm:6991ac61-8db8-4a32-8fef-c462e2369055/{}/{}/{}".format(conf["WEB_SERVER_IP"], conf["WEB_SERVER_PORT_EXT"], fromdate, todate, timestep)
response = requests.request("GET", url)
assert (response.status_code == 200)
df = pd.DataFrame.from_records(json.loads(response.text)).sort_values(by=["_id"]).rename({"_id": "timestamp"}, axis=1)
assert (len(df) > 0)
df = df.round(2)
df["timestamp"] = df["timestamp"].apply(lambda x: dt.datetime.fromtimestamp(x / 1000) + dt.timedelta(microseconds = 1))
name = "stats-{}-{}-{}".format(fromdate, todate, timestep)
df.to_csv("{}.csv".format(name), index=False)

fig, axs = plt.subplots(1, 2, figsize=(4 * 2, 3 * 1))
df.plot(x="timestamp", y="count", ax=axs[0])
df.plot(x="timestamp", y="avg_delay_ocb", ax=axs[1])
# df.plot(x="timestamp", y="avg_delay_kafka", ax=axs[1])

axs[0].set_title("Messages by time")
axs[0].set_ylabel("Count")
axs[1].set_title("Delay (ms) by time")
axs[1].set_ylabel("Delay (ms)")

for ax in axs:
    ax.set_xlabel('Time')
    xfmt = md.DateFormatter('%Y-%m-%d %H:%M:%S')
    ax.xaxis.set_major_formatter(xfmt)
    # show the grid
    ax.grid(visible=True, which='major', linestyle='-', axis='y')
    # ax.set_yscale('log')

fig.tight_layout()
fig.savefig("{}.svg".format(name))
fig.savefig("{}.pdf".format(name))