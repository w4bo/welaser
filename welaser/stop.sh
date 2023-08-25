#!/bin/bash
# docker compose down --remove-orphans
# docker compose -f kafka-docker/docker compose.yml --env-file .env down --remove-orphans
docker stack rm kafka welaser
# rm -f logs/*.txt
