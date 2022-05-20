#!/bin/sh
set -e
REPLAY=$1
docker ps --filter name=replayexecutor-${REPLAY} --filter status=running -aq | xargs docker stop
docker rm $(docker container ls -aq --filter name=replayexecutor-${REPLAY}) -f
