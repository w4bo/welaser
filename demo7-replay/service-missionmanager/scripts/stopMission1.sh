#!/bin/sh

MISSION_NAME=$1

docker ps --filter name=${MISSION_NAME}$ --filter status=running -aq | xargs docker stop
docker rm $(docker container ls -aq --filter name=${MISSION_NAME}$) -f
