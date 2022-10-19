#!/bin/bash
set -exo
. ./scripts/loadEnv.sh
docker-compose up --build &>logs/docker-compose-$(date +%s).txt &
./wait-for-it.sh ${ORION_IP}:${ORION_PORT_EXT} --timeout=480 -- echo "OCB is up"
./wait-for-it.sh ${DRACO_IP}:${DRACO_PORT_EXT} --timeout=480 -- echo "ETL (old draco) is up"
./wait-for-it.sh ${MOSQUITTO_IP}:${MOSQUITTO_PORT_EXT} --timeout=480 -- echo "Mosquitto is up"
./wait-for-it.sh ${IOTA_IP}:${IOTA_NORTH_PORT} --timeout=480 -- echo "IoTA is up"
./wait-for-it.sh ${IP}:${WEB_SERVER_PORT_EXT} --timeout=480 -- echo "NodeJS is up"