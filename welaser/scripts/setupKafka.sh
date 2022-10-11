#!/bin/bash
set -exo
. ./scripts/loadEnv.sh
docker-compose -f kafka-docker/docker-compose.yml --env-file .env up &>logs/docker-kafka-$(date +%s).txt &
./wait-for-it.sh ${KAFKA_IP}:${KAFKA_PORT_EXT} --timeout=480 -- echo "Kafka is up"
sleep 60
