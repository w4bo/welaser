#!/bin/bash
set -e
set -o xtrace

if [ -f .env ]; then
  export $(echo $(cat .env | sed 's/#.*//g' | xargs) | envsubst)
fi

docker-compose up --build &>/dev/null &

../wait-for-it.sh ${IP}:${WEB_SERVER_PORT_EXT} --timeout=240 -- echo "Webserver is up"
../wait-for-it.sh ${ORION_IP}:${ORION_PORT_EXT} --timeout=240 -- echo "OCB is up"

# Create the fiware-service
curl -ivX POST \
  "http://${IOTA_IP}:${IOTA_NORTH_PORT}/iot/services" \
  -H "Content-Type: application/json" \
  -H "fiware-service: ${FIWARE_SERVICE}" \
  -H "fiware-servicepath: ${FIWARE_SERVICEPATH}" \
  -d '{
 "services": [
   {
     "apikey":      "'${FIWARE_API_KEY}'",
     "cbroker":     "http://'${ORION_IP}':'${ORION_PORT_EXT}'",
     "entity_type": "Thing",
     "resource":    ""
   }
 ]
}' #&>/dev/null

# Here we create two subscriptions, but in the later demos we will use a single subscription/sink.

# Create the subscription necessary for the web server (this is for the thermometers)
curl -ivX POST \
  "http://${ORION_IP}:${ORION_PORT_EXT}/v2/subscriptions" \
  -H "Content-Type: application/json" \
  -H "fiware-service: ${FIWARE_SERVICE}" \
  -H "fiware-servicepath: ${FIWARE_SERVICEPATH}" \
  -d '{
  "description": "Notify me when any Thermometer changes state",
  "subject": {
  "entities": [{"idPattern": ".*","type": "Thermometer"}],
  "condition": {
    "attrs": ["Status", "Temperature", "Timestamp"]
  }
  },
  "notification": {
  "http": {
    "url": "http://:'${IP}':'${WEB_SERVER_PORT_EXT}'/api/fiware/notification/thermometer"
  },
  "attrsFormat" : "keyValues"
  }
}'

# Create the subscription necessary for the web server (this is for the cameras)
curl -ivX POST \
  url "http://${ORION_IP}:${ORION_PORT_EXT}/v2/subscriptions" \
  -H "Content-Type: application/json" \
  -H "fiware-service: ${FIWARE_SERVICE}" \
  -H "fiware-servicepath: ${FIWARE_SERVICEPATH}" \
  -d '{
  "description": "Notify me when any Camera changes state",
  "subject": {
  "entities": [{"idPattern": ".*","type": "Camera"}],
  "condition": {
    "attrs": ["Status", "Image", "Timestamp"]
  }
  },
  "notification": {
  "http": {
    "url": "http://:'${IP}':'${WEB_SERVER_PORT_EXT}'/api/fiware/notification/camera"
  },
  "attrsFormat" : "keyValues"
  }
}'
