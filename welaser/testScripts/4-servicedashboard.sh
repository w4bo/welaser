#!/bin/bash
set -exo

docker exec kafkaproxy npm test
docker exec nodews npm test