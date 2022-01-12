#!/bin/bash

docker ps --filter name=replayexecutor* --filter status=running -aq | xargs docker stop
docker rm $(docker container ls -aq --filter name=replayexecutor*)
