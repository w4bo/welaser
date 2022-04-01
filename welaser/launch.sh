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

if [ -f devices/build/libs/devices-all.jar ]; then
  echo "devices-all.jar already exists"
else
  cd devices
  ./gradlew
  cd ..
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

cd devices
java -cp build/libs/devices-all.jar it.unibo.devices.Canaries &>/dev/null &
