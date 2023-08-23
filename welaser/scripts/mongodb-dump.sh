#!/bin/bash
set -exo
. ./scripts/loadEnv.sh
D=$(date +"%Y_%m_%d_%H_%M_%S")
for folder in ${MONGO_DB_PERS_DB} "orion"
do
    docker exec -i mongo-db /usr/bin/mongodump --db $folder --out /$folder-$D
    docker cp mongo-db:/$folder-$D mounts/mongodb-dump
    docker exec -i mongo-db /usr/bin/mongorestore --nsFrom $folder'.*' --nsTo $folder-${D}'.*' /$folder-$D
    for c in 'urn:ngsi-ld:AgriFarm:6991ac61-8db8-4a32-8fef-c462e2369055' 'entities'
    do
        docker exec -i mongo-db /usr/bin/mongoexport -d $folder -c $c --jsonArray > mounts/mongodb-dump/$folder-$D/$c.json
        if [ ! -s mounts/mongodb-dump/$folder-$D/$c.json ] ; then
            rm mounts/mongodb-dump/$folder-$D/$c.json
        fi
    done
done
