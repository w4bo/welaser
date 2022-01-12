#!/bin/bash
set -e
set -o xtrace

echo $(pwd)
if [ -f .env ]; then
  export $(echo $(cat .env | sed 's/#.*//g' | xargs) | envsubst)
else
  echo "Could not find the .env file"
fi

NUM=$1
STATUS=$2
TIME=$3
WHERE=$4
LATITUDE=$5
LONGITUDE=$6
MISSION=$7
DOMAIN=$8
MOVE=$9
NETWORK="demo7-replay_default"

curl -v \
  --max-time 10 \
  --connect-timeout 2 \
  --retry 5 \
  --retry-delay 0 \
  --retry-max-time 40 \
  -iX POST \
  "http:/${IOTA_IP}:${IOTA_NORTH_PORT}/iot/devices" \
  -H 'Content-Type: application/json' \
  -H "fiware-service: ${FIWARE_SERVICE}" \
  -H "fiware-servicepath: ${FIWARE_SERVICEPATH}" \
  -d '{
  "devices": [{
    "device_id": "'"thermometer$NUM"'",
    "entity_name": "'"urn:ngsi-ld:thermometer:$NUM"'",
    "entity_type": "Thermometer",
    "transport": "MQTT",
    "commands": [
      { "name": "on", "type": "command" },
      { "name": "off", "type": "command" }
    ],
    "attributes": [
      { "object_id": "temp", "name": "Temperature", "type": "Float" },
      { "object_id": "stat", "name": "Status", "type": "Boolean" },
      { "object_id": "time", "name": "Time", "type": "Integer" },
      { "object_id": "lat", "name": "Latitude", "type": "Float" },
      { "object_id": "lon", "name": "Longitude", "type": "Float" },
      { "object_id": "where", "name": "Location", "type": "String" }
    ],
    "static_attributes": [
      { "name": "Mission", "type": "String", "value": "'"$MISSION"'"},
      { "name": "Domain", "type": "String", "value": "'"$DOMAIN"'"}
    ]
  }]
}'

# pass NUM to docker as env variable
docker run \
  --env ID=${NUM} \
  --network ${NETWORK} \
  --env STATUS=${STATUS} \
  --env TIME=${TIME} \
  --env INITIAL_LATITUDE=${LATITUDE} \
  --env INITIAL_LONGITUDE=${LONGITUDE} \
  --env MOVE=${MOVE} \
  --env WHERE=${WHERE} \
  --name therm${NUM}_${MISSION} \
  --env-file .env \
  fiware-device/thermometer &>/dev/null &
