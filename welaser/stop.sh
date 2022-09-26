#!/bin/bash

./scripts/stopDevices.sh
./scripts/stopReplay.sh
docker-compose down --remove-orphans
docker-compose -f kafka-docker/docker-compose.yml down --remove-orphans
rm -f logs/*.txt