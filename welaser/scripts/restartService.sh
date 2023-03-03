#!/bin/bash
set -exo
# for var in "$@"
# do
#     echo "Restarting $var"
#     docker stop $var
#     docker-compose up --detach --build $var
# done
docker-compose stop $@
docker-compose rm --force $@
docker-compose up --detach --build $@
