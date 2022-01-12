#!/bin/bash
set -e
set -o xtrace

if [ -f .env ]; then
  export $(echo $(cat .env | sed 's/#.*//g' | xargs) | envsubst)
else
  echo "Could not find the .env file"
  exit 1
fi

NUM=$1
STATUS=$2
TIME=$3
PAYLOAD=$4
NETWORK="demo1-term-camera-dashboard_default"

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
    "device_id":   "'"thermometer$NUM"'",
    "entity_name": "'"urn:ngsi-ld:thermometer:$NUM"'",
    "entity_type": "Thermometer",
    "transport": "MQTT",
    "commands": [
      { "name": "on", "type": "command" },
      { "name": "off", "type": "command" }
    ],
    "attributes": [
      { "object_id": "t", "name": "Temperature", "type": "Float" },
      { "object_id": "s", "name": "Status", "type": "Boolean" },
      { "object_id": "time", "name": "Time", "type": "Integer" },
      { "object_id": "p", "name": "Payload", "type": "String"}
    ]
  }]
}'

# pass NUM to docker as env variable
docker run \
  --env ID=${NUM} \
  --network ${NETWORK} \
  --env STATUS=${STATUS} \
  --env TIME=${TIME} \
  --env PAYLOAD_KB=${PAYLOAD} \
  --env MQTT_USER=${MOSQUITTO_USER} \
  --env MQTT_PWD=${MOSQUITTO_PWD} \
  --name term${NUM} \
  fiware-device/thermometer
