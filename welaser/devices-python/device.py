import _thread as thread
import base64
import json
import os
import random
import re
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import requests
from dotenv import load_dotenv, find_dotenv

# Idea:
# - The robot wakes up, it knows its IP address (from the .env file), and it chooses a random port on which it will
# listen for commands (i.e., FIWARE notifications)
# - The robot registers itself as a subscriber of FIWARE notifications (i.e., it tells the OCB the IP and the port on
# which it is listening to
# - While the robot is operating (i.e., the run() function), it also listens to commands

# get a random port for the device
port = random.randint(12346, 13000)
# load the environment variables
load_dotenv(find_dotenv())
content_type = {"Content-Type": "application/json"}

# read the initial status from file
with open("carob-1.json") as f:
    status = json.load(f)
    status["id"] = "carob-python"

# register the entity
r = requests.post(url="http://{}:{}/v2/entities?options=keyValues".format(os.environ.get("ORION_IP"), os.environ.get("ORION_PORT_EXT")),
                  data=json.dumps(status),
                  headers=content_type)
print(r.text)

id = status["id"]

# updates must not contain the entity id and type
del status["id"]
del status["type"]
# updates must not contain cmd, unless I am sending a command to the robot
del status["cmd"]


# The robot behavior
def run():
    # update the entity for a minute
    i = 0
    while i < 300:
        # sleep
        time.sleep(1)
        # update the entity status
        status["status"][2] = time.time()
        # ... and image
        with open("img01.png", "rb") as image_file:
            # You cannot send messages containing "=" to the OCB,
            # so you need to encode it using its html representation ("%3D")
            # See the encoding here: https://www.w3schools.com/tags/ref_urlencode.asp
            status["status"][1] = base64.b64encode(image_file.read()).decode('utf-8').replace("=", "%3D")

        # update the context broker
        r = requests.patch(url="http://{}:{}/v2/entities/{}/attrs?options=keyValues".format(os.environ.get("ORION_IP"), os.environ.get("ORION_PORT_EXT"), id),
                           data=json.dumps(status),
                           headers=content_type)
        assert (r.status_code == 204)
        i += 1


# The server listening to the commands
def server():
    class S(BaseHTTPRequestHandler):
        def log_request(self, code='-', size='-'):
            return

        def _set_response(self):
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write(bytes("", "utf-8"))

        def do_GET(self):
            # do nothing
            self._set_response()

        def do_POST(self):
            self._set_response()
            content_length = int(self.headers['Content-Length'])  # Get the size of data
            post_data = self.rfile.read(content_length)  # Get the data itself
            payload = json.loads(post_data.decode('utf-8'))  # get the payload
            # Handle the command
            print(payload)

    def run(server_class=ThreadingHTTPServer, handler_class=S, port=port):
        # register the device to receive notifications/commands from the OCB
        s = """{ "description": "Notify the entity when it receives a command",
                 "subject": { "entities": [{ "id" : """ + '"' + id + """" }], "condition": { "attrs": [ "cmd" ] }},
                 "notification": { "http": { "url": "http://""" + os.environ.get("DEVICE_IP") + """:""" + str(port) + """" }, "attrsFormat" : "keyValues", "attrs" : ["cmd"] }
                }"""
        print(re.sub('\\s+', ' ', s))
        r = requests.post(url="http://{}:{}/v2/subscriptions".format(os.environ.get("ORION_IP"), os.environ.get("ORION_PORT_EXT")),
                           data=re.sub('\\s+', ' ', s),
                           headers=content_type)
        assert (r.status_code == 201)
        print("Listening on port: " + str(port))
        server_address = ('0.0.0.0', port)
        httpd = server_class(server_address, handler_class)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass
        httpd.server_close()

    run()


try:
    thread.start_new_thread(run, ())
    thread.start_new_thread(server, ())
    while 1:
        time.sleep(1)
except KeyboardInterrupt:
    pass
