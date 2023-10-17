#!/bin/bash
docker compose -f docker-compose.yml -f docker-compose.kafka.yml down --remove-orphans
# docker stack rm kafka welaser
rm -f logs/*.txt
