#!/bin/bash
set -exo

. ./scripts/loadEnv.sh

if [ -f mosquitto/pwfile ]; then
    echo "pwfile ok"
else
    echo "Could not find the mosquitto/pwfile file"
    exit 1
fi

./stop.sh
./scripts/createVenv.sh
./scripts/setupKafka.sh
./scripts/setupFiware.sh

curl -iX POST \
    "http://${DRACO_IP}:${DRACO_PORT_EXT}/v2/subscriptions" \
    -H 'Content-Type: application/json' \
    -d '{
  "description": "ETL",
  "subject": { "entities": [{ "idPattern": ".*" } ] },
  "notification": { "http": { "url": "http://'${DRACO_IP}':'${DRACO_PORT_EXT}'/v2/notify" }, "attrsFormat" : "keyValues" }
}'

curl -iX POST \
    "http://${DRACO_IP}:${DRACO_PORT_EXT}/v2/subscriptions" \
    -H 'Content-Type: application/json' \
    -d '{
  "description": "IoTAgent",
  "subject": { "entities": [{ "idPattern": ".*" }], "condition": { "attrs": [ "cmd" ] }},
  "notification": { "http": { "url": "http://'${IOTA_IP}':'${IOTA_PORT_EXT}'/" }, "attrsFormat" : "keyValues", "attrs" : ["cmd"] }
}'
cd devices
./gradlew --stacktrace --scan

run_mission=0
while getopts "s" opt
do
    case $opt in
    (s) run_mission=1 ;;
    (*) printf "Illegal option '-%s'\n" "$opt" && exit 1 ;;
    esac
done
((run_mission)) && ./gradlew runMission --stacktrace &>../logs/mission-$(date +%s)-devices.txt &
