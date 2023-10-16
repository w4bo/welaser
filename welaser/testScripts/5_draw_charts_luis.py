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
boundaries = [(0, 9999999999999)] 
boundaries = [(1695859200000, 1695945599000), 
              (1692835200000, 1693094399000), 
              (1692316800000, 1692403199000), 
              (1690329600000, 1690415999000)] 
# 1678273200000 2023/08/03 11:00
# 1678291200000 2023/08/03 16:00
for fromdate, todate in boundaries:
    timestep = 10
    url = "http://{}:{}/api/stats/urn:ngsi-ld:AgriFarm:6991ac61-8db8-4a32-8fef-c462e2369055/{}/{}/{}".format(conf["WEB_SERVER_IP"], conf["WEB_SERVER_PORT_EXT"], fromdate, todate, timestep)
    response = requests.request("GET", url)
    assert (response.status_code == 200)
    df = pd.DataFrame.from_records(json.loads(response.text)).sort_values(by=["_id"]).rename({"_id": "timestamp"}, axis=1)
    assert (len(df) > 0)
    df = df.round(2)
    df["timestamp"] = df["timestamp"].apply(lambda x: dt.datetime.fromtimestamp(x / 1000) + dt.timedelta(microseconds = 1))
    name = "stats-{}-{}-{}".format(fromdate, todate, timestep)
    df = df[df["avg_delay_ocb"] < 10000]
    df = df[df["avg_delay_kafka"] < 10000]  
    df.to_csv("{}.csv".format(name), index=False)

    fig, axs = plt.subplots(1, 2, figsize=(4 * 2, 3 * 1))
    df.plot(x="timestamp", y="count", ax=axs[0], label="Count")
    df["avg_delay_kafka"] = df["avg_delay_kafka"] - df["avg_delay_ocb"]
    df.plot(x="timestamp", y="avg_delay_ocb", ax=axs[1], label="External")
    df.plot(x="timestamp", y="avg_delay_kafka", ax=axs[1], label="Internal")

    axs[0].set_title("Messages by time")
    axs[0].set_ylabel("Count")
    axs[1].set_title("Delay (ms) by time")
    axs[1].set_ylabel("Delay (ms)")
    axs[0].legend()
    axs[1].legend()
    for ax in axs:
        ax.set_xlabel('Time')
        xfmt = md.DateFormatter('%Y-%m-%d %H:%M') # :%M:%S 
        ax.xaxis.set_major_formatter(xfmt)
        # show the grid
        ax.grid(visible=True, which='major', linestyle='-', axis='y')
        # ax.set_yscale('log')

    fig.tight_layout()
    fig.savefig("{}.svg".format(name))
    fig.savefig("{}.pdf".format(name))