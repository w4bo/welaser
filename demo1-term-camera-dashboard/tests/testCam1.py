import urllib.request
import json

url = "http://localhost:8082/v2/entities/urn:ngsi-ld:camera:1"

hdr = {'fiware-service': 'openiot', 'fiware-servicepath': '/'}

req = urllib.request.Request(url, headers=hdr)
response = urllib.request.urlopen(req)

data = response.read()
encoding = response.info().get_content_charset('utf-8')
cam1 = json.loads(data.decode(encoding))

if cam1['type'] != 'Camera':
  raise SystemExit("This device should be a thermometer")

if cam1['Image']['type'] != "String":
  raise SystemExit("Image should be a string")

if cam1['Status']['type'] != "Boolean":
  raise SystemExit("Status should be a boolean")

if cam1['Time']['type'] != "Integer":
  raise SystemExit("Time should be a Integer")

if cam1['TimeInstant']['type'] != "DateTime":
  raise SystemExit("DateTime should be a DateTime")





