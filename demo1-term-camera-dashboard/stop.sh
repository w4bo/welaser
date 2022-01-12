#!/bin/bash
set -o xtrace

docker ps --filter name=term* --filter status=running -aq | xargs docker stop
docker ps --filter name=camera* --filter status=running -aq | xargs docker stop
docker-compose down
docker rm $(docker container ls -aq --filter name=term*) -f
docker rm $(docker container ls -aq --filter name=camera*) -f
