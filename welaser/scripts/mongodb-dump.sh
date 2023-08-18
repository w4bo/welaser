#!/bin/bash
set -exo
. ./scripts/loadEnv.sh
D=$(date +"%Y_%m_%d_%H_%M_%S")
mkdir -p mounts/mongodb-dump
for folder in ${MONGO_DB_PERS_DB} "orion"
do
    docker exec -i mongo-db /usr/bin/mongodump --port ${MONGO_DB_PERS_PORT_INT} --db $folder --out /dump-${D}
    docker cp mongo-db:/dump-${D} mounts/mongodb-dump
    docker exec -i mongo-db /usr/bin/mongorestore --nsFrom $folder'.*' --nsTo $folder-${D}'.*' /dump-${D}
done
