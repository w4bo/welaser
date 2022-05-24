from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import os
from datetime import datetime
import requests

# load the environment variables
PLANNER_PORT_EXT = int(os.getenv("PLANNER_PORT_EXT"))
ORION_PORT_EXT = int(os.getenv("ORION_PORT_EXT"))
ORION_IP = os.getenv("ORION_IP")

def create_plan():
    # get all the agrifarms
    agrifarms = requests.get('http://' + ORION_IP + ':' + str(ORION_PORT_EXT) + '/v2/entities?type=AgriFarm&options=keyValues&limit=1000').json()
    # select the first one
    agrifarm = agrifarms[0]
    # print it
    print(json.dumps(agrifarm))
    # get all the agriparcels
    agriparcels = requests.get('http://' + ORION_IP + ':' + str(ORION_PORT_EXT) + '/v2/entities?type=AgriParcel&options=keyValues&limit=1000').json()
    # iterate over them
    for agriparcel in agriparcels:
        # if the agriparcel is in the selected farm
        if agriparcel["id"] in agrifarm["hasAgriParcel"]:
            # ...print it
            print(json.dumps(agriparcel))

    # read the agrimission from file and return it as a plan
    with open('mission-123.json') as f:
        return json.load(f)

class S(BaseHTTPRequestHandler):

    def _set_response(self, payload=""):
        self.send_response(200)
        self.send_header('Content-type', 'text/html')
        self.end_headers()
        if payload != "":
            self.wfile.write(bytes(payload, "utf-8"))

    def do_GET(self):
        self._set_response()

    def do_POST(self):
        content_length = int(self.headers['Content-Length']) # Get the size of data
        data = self.rfile.read(content_length).decode('utf-8')
        now = datetime.now()
        # this is the heartbeat necessary to test the health of the server
        if "heartbeat" in data:
            print("Alive at " + now.strftime("%m/%d/%Y, %H:%M:%S"))
            self._set_response()
        else:
            print("Working on request at " + now.strftime("%m/%d/%Y, %H:%M:%S") + "...", end=" ")
            # create and return the plan (the plan must be both a valid JSON object and fiware entity)
            self._set_response(json.dumps(create_plan()))
            now = datetime.now()
            print("Done at " + now.strftime("%m/%d/%Y, %H:%M:%S"))

def run(server_class=HTTPServer, handler_class=S, port=PLANNER_PORT_EXT):
    server_address = ('0.0.0.0', port)
    print(server_address)
    httpd = server_class(server_address, handler_class)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    httpd.server_close()

run()