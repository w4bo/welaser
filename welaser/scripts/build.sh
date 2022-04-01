#!/bin/bash
set -e
set -o xtrace

# docker builder prune --all
docker-compose build
docker-compose --file kafka-docker/docker-compose.yml --env-file .env build
docker build -t replay-executor ./service-replay
docker build -t fiware-robot ./robot-ubuntu # --no-cache