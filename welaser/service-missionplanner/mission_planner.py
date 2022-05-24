from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import os
from datetime import datetime

PLANNER_PORT_EXT = int(os.getenv("PLANNER_PORT_EXT"))

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
        # data = json.loads(self.rfile.read(content_length).decode('utf-8')) # get the data
        data = self.rfile.read(content_length).decode('utf-8')
        now = datetime.now()
        if "heartbeat" in data:
            print("Alive at " + now.strftime("%m/%d/%Y, %H:%M:%S"))
        else:
            print("Working on request at " + now.strftime("%m/%d/%Y, %H:%M:%S") + "...", end=" ")
            with open('mission-123.json') as f:
                self._set_response(json.dumps(json.load(f)))
            now = datetime.now()
            print("Done at " + now.strftime("%m/%d/%Y, %H:%M:%S"))

def run(server_class=HTTPServer, handler_class=S, port=PLANNER_PORT_EXT):
    # logging.basicConfig(level=logging.INFO)
    server_address = ('0.0.0.0', port)
    print(server_address)
    httpd = server_class(server_address, handler_class)
    # logging.info('Starting httpd...\n')
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    httpd.server_close()
    # logging.info('Stopping httpd...\n')

run()