#!/bin/bash
set -e
set -o xtrace

if [ -f .env ]; then
  export $(echo $(cat .env | sed 's/#.*//g' | xargs) | envsubst)
else
  echo "Could not find the .env file"
  exit 1
fi

if [ -f mosquitto/pwfile ]; then
  echo "pwfile ok"
else
  echo "Could not find the mosquitto/pwfile file"
  exit 1
fi

./stop.sh
./scripts/setupAll.sh

curl -iX POST \
  "http://${ORION_IP}:${ORION_PORT_EXT}/v2/subscriptions" \
  -H 'Content-Type: application/json' \
  -H "fiware-service: ${FIWARE_SERVICE}" \
  -H "fiware-servicepath: ${FIWARE_SERVICEPATH}" \
  -d '{
  "description": "Notify Draco of all device changes",
  "subject": {
    "entities": [{ "idPattern": ".*" } ]
  },
  "notification": {
    "http": { "url": "http://'${DRACO_IP}':'${DRACO_PORT_EXT}'/v2/notify" }
  }
}'

curl -iX POST \
  "http://${ORION_IP}:${ORION_PORT_EXT}/v2/subscriptions" \
  -H 'Content-Type: application/json' \
  -d '{
  "description": "Notify Draco of all device changes",
  "subject": {
    "entities": [{ "idPattern": ".*" } ]
  },
  "notification": {
    "http": { "url": "http://'${DRACO_IP}':'${DRACO_PORT_EXT}'/v2/notify" }
  }
}'

devices/thermometerMQTT/launcher.sh canary1 on 1000 "Spain" 40.31275148286198 -3.4808443373094113 canary-m852149 canary true&>/dev/null &
devices/thermometerMQTT/launcher.sh canary2 on 1000 "Spain" 40.31275148287198 -3.4808443373594113 canary-m852149 canary false&>/dev/null &


