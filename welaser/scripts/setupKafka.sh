#!/bin/bash
set -exo

if [ -f .env ]; then
  export $(echo $(cat .env | sed 's/#.*//g' | xargs) | envsubst)
fi

docker-compose -f kafka-docker/docker-compose.yml --env-file .env up  &>/dev/null &
./wait-for-it.sh ${KAFKA_IP}:${KAFKA_PORT_EXT} --timeout=480 -- echo "Kafka is up"
