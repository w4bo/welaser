#!/bin/bash

docker ps --filter name=therm* --filter status=running -aq | xargs docker stop
docker ps --filter name=camera* --filter status=running -aq | xargs docker stop
docker ps --filter name=robot* --filter status=running -aq | xargs docker stop
docker rm $(docker container ls -aq --filter name=therm*) -f
docker rm $(docker container ls -aq --filter name=camera*) -f
docker rm $(docker container ls -aq --filter name=robot*) -f
