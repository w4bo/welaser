import urllib.request
import json

url = "http://localhost:8082/v2/entities/urn:ngsi-ld:thermometer:1"

hdr = {'fiware-service': 'openiot', 'fiware-servicepath': '/'}

req = urllib.request.Request(url, headers=hdr)
response = urllib.request.urlopen(req)

data = response.read()
encoding = response.info().get_content_charset('utf-8')
term1 = json.loads(data.decode(encoding))

if term1['type'] != 'Thermometer':
  raise SystemExit("This device should be a thermometer")

if term1['Payload']['type'] != "String":
  raise SystemExit("Payload should be a string")

if term1['Status']['type'] != "Boolean":
  raise SystemExit("Status should be a boolean")

if term1['Temperature']['type'] != "Float":
  raise SystemExit("Temperature should be a float")

if term1['Time']['type'] != "Integer":
  raise SystemExit("Time should be a Integer")

if term1['TimeInstant']['type'] != "DateTime":
  raise SystemExit("DateTime should be a DateTime")





