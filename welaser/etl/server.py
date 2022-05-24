from http.server import BaseHTTPRequestHandler, HTTPServer, ThreadingHTTPServer
import json
import time
import os
from kafka import KafkaProducer
from datetime import datetime

KAFKA_IP = os.getenv("KAFKA_IP")
KAFKA_PORT = os.getenv("KAFKA_PORT_EXT")
DRACO_PORT = int(os.getenv("DRACO_PORT_EXT"))
DRACO_RAW_TOPIC = os.getenv("DRACO_RAW_TOPIC")

producer = KafkaProducer(bootstrap_servers=[KAFKA_IP + ":" + KAFKA_PORT], value_serializer=lambda x: json.dumps(x).encode('utf-8'))

class S(BaseHTTPRequestHandler):

    def _set_response(self):
        self.send_response(200)
        self.send_header('Content-type', 'text/html')
        self.end_headers()
        self.wfile.write(bytes("", "utf-8"))
        # if not self.wfile.closed:
        #     self.wfile.flush()
        # self.wfile.close()
        # self.rfile.close()

    def do_GET(self):
        self._set_response()

    def do_POST(self):
        self._set_response()
        content_length = int(self.headers['Content-Length']) # Get the size of data
        post_data = self.rfile.read(content_length) # Get the data itself
        subscription = json.loads(post_data.decode('utf-8')) # get the subscription
        now = datetime.now()
        if "heartbeat" in subscription:
            print("Alive at " + now.strftime("%m/%d/%Y, %H:%M:%S"))
            return
        # print("Working on request at " + now.strftime("%m/%d/%Y, %H:%M:%S") + "...", end=" ")
        data = subscription["data"] # get the data from the subscription
        for d in data: # data can be more than one item, do some preprocessing
            def get(k, domain):
                if k in d:
                    if "value" in d[k]:
                        return d[k]["value"] # this is filled by an IoT Sensor
                    else:
                        return d[k] # this is filled by the robot
                else:
                    return domain

            domain = "canary"
            domain = get("Domain", domain)
            domain = get("domain", domain)

            mission = "dummy"
            mission = get("Mission", mission)
            mission = get("mission", mission)

            d["domain"] = domain
            d["mission"] = mission
            d["timestamp_subscription"] = time.time()
            producer.send('data.' + domain + ".realtime", value=d)
            producer.send('data.' + domain + ".realtime." + mission, value=d)
            producer.send(DRACO_RAW_TOPIC, value=d)
        now = datetime.now()
        # print("Done at " + now.strftime("%m/%d/%Y, %H:%M:%S"))

def run(server_class=ThreadingHTTPServer, handler_class=S, port=DRACO_PORT):
    # logging.basicConfig(level=logging.INFO)
    server_address = ('0.0.0.0', port)
    httpd = server_class(server_address, handler_class)
    # logging.info('Starting httpd...\n')
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    httpd.server_close()
    # logging.info('Stopping httpd...\n')

run()