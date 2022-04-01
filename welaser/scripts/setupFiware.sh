#!/bin/bash
set -e
set -o xtrace

if [ -f .env ]; then
  export $(echo $(cat .env | sed 's/#.*//g' | xargs) | envsubst)
else
  echo "Could not find the .env file"
  exit 1
fi

if [ -f ./mosquitto/pwfile ]; then
  echo "pwfile found"
else
  echo "Could not find the pwfile file"
  exit 1
fi

docker-compose up --build &>/dev/null &

./wait-for-it.sh ${ORION_IP}:${ORION_PORT_EXT} --timeout=480 -- echo "OCB is up"
./wait-for-it.sh ${MOSQUITTO_IP}:${MOSQUITTO_PORT_EXT} --timeout=480 -- echo "Mosquitto is up"
./wait-for-it.sh ${IOTA_IP}:${IOTA_NORTH_PORT} --timeout=480 -- echo "IoTA is up"

sleep 2

# Setup the service group
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
}'
