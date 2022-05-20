#!/bin/bash

./scripts/stopDevices.sh
./scripts/stopReplay.sh
docker-compose down
docker-compose -f kafka-docker/docker-compose.yml --env-file .env down
rm -f logs/*.txt