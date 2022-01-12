#!/bin/bash

docker stop ${1}
docker-compose up --detach --build ${1}
