import urllib.request
import json

hdr = {'fiware-service': 'openiot', 'fiware-servicepath': '/'}

url = "http://localhost:8080/api/data/thermometer/urn:ngsi-ld:thermometer:1/on"

request = urllib.request.Request(url, headers=hdr)
request.get_method = lambda: 'PATCH'
response = urllib.request.urlopen(request)


url = "http://localhost:8082/v2/entities/urn:ngsi-ld:thermometer:1"
req = urllib.request.Request(url, headers=hdr)
response = urllib.request.urlopen()

data = response.read()
encoding = response.info().get_content_charset('utf-8')
term1 = urllib.request.urlopen(req).read()

if term1['Status']['value'] != True:
  raise SystemExit("Term should be on")


