#!/bin/bash
set -exo
. ./scripts/loadEnv.sh
docker compose -f docker-compose.kafka.yml up --build &>logs/kafka.txt & #-$(date +%s).txt &
# DO NOT USE --remove-orphans, since it will kill the other containers (e.g., OCB)
# docker stack deploy --compose-file docker-compose.kafka.yml kafka # &>logs/docker-kafka-$(date +%s).txt &
./wait-for-it.sh ${ZOOKEEPER_IP}:${ZOOKEEPER_PORT_EXT} --timeout=480 -- echo "Zookeeper is up"
./wait-for-it.sh ${KAFKA_IP}:${KAFKA_PORT_EXT} --timeout=480 -- echo "Kafka is up"
source testScripts/venv/bin/activate
python testScripts/waitforkafka.py
