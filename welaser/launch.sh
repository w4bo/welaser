#!/bin/bash
set -exo

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
    "http://${DRACO_IP}:${DRACO_PORT_EXT}/v2/subscriptions" \
    -H 'Content-Type: application/json' \
    -d '{
  "description": "ETL",
  "subject": { "entities": [{ "idPattern": ".*" } ] },
  "notification": { "http": { "url": "http://'${DRACO_IP}':'${DRACO_PORT_EXT}'/v2/notify" } }
}'

curl -iX POST \
    "http://${DRACO_IP}:${DRACO_PORT_EXT}/v2/subscriptions" \
    -H 'Content-Type: application/json' \
    -d '{
  "description": "IoTAgent",
  "subject": { "entities": [{ "idPattern": ".*" }], "condition": { "attrs": [ "cmd" ] }},
  "notification": { "http": { "url": "http://'${IOTA_IP}':'${IOTA_NORTH_PORT}'/" }, "attrsFormat" : "keyValues", "attrs" : ["cmd"] }
}'
cd devices
./gradlew --stacktrace --scan
./gradlew runMission --stacktrace &>../logs/missionmanager-$(date +%s)-${DOMAIN_NAME}-${MISSION_NAME}-devices.txt &
