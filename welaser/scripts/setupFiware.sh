#!/bin/bash
set -exo
. ./scripts/loadEnv.sh
docker compose up --build --remove-orphans &>logs/docker-compose.txt & #-$(date +%s) 
# docker stack deploy --compose-file docker-compose.yml welaser  # &>logs/docker-compose-$(date +%s).txt &
./wait-for-it.sh "${IMAGESERVER_IP}:${IMAGESERVER_PORT_FTP21_EXT}" --timeout=480 -- echo "FTP server is up"
./wait-for-it.sh "${IMAGESERVER_IP}:${IMAGESERVER_PORT_HTTP_EXT}" --timeout=480 -- echo "Nginx is up"
./wait-for-it.sh "${ORION_IP}:${ORION_PORT_EXT}" --timeout=480 -- echo "OCB is up"
./wait-for-it.sh "${DRACO_IP}:${DRACO_PORT_EXT}" --timeout=480 -- echo "ETL (old draco) is up"
./wait-for-it.sh "${MOSQUITTO_IP}:${MOSQUITTO_PORT_EXT}" --timeout=480 -- echo "Mosquitto is up"
./wait-for-it.sh "${IOTA_IP}:${IOTA_PORT_EXT}" --timeout=480 -- echo "IoTA is up"
./wait-for-it.sh "${WEB_SERVER_IP}:${WEB_SERVER_PORT_EXT}" --timeout=480 -- echo "NodeJS is up"
./wait-for-it.sh "${PLANNER_IP}:${PLANNER_PORT_EXT}" --timeout=480 -- echo "MissionPlanner is up"
./wait-for-it.sh "${BUILDER_IP}:${BUILDER_PORT_EXT}" --timeout=480 -- echo "MapBuilder is up"
./wait-for-it.sh "${SUPERVISOR_IP}:${SUPERVISOR_PORT_EXT}" --timeout=480 -- echo "MissionSupervisor is up"
