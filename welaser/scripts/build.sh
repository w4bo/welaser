#!/bin/bash
set -exo

# docker builder prune --all
# docker build -t replay-executor ./service-replay
# docker pull ghcr.io/w4bo/welaser-robot:master
docker-compose build
docker-compose --file kafka-docker/docker-compose.yml --env-file .env build
