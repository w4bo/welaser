#!/bin/sh
set -e

MISSION_NAME=$1
ID=$2
KAFKA_IP=$3
KAFKA_PORT_EXT=$4
MONGO_DB_PERS_IP=$5
MONGO_PORT=$6

docker run \
  --env MISSION_NAME=${MISSION_NAME} \
  --env ID=${ID} \
  --env KAFKA_IP=${KAFKA_IP} \
  --env KAFKA_PORT_EXT=${KAFKA_PORT_EXT} \
  --env MONGO_IP=${MONGO_DB_PERS_IP} \
  --env MONGO_PORT=${MONGO_PORT} \
  --name replayexecutor-${MISSION_NAME}-${ID} \
  replay-executor &
