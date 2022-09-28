#!/bin/bash
set -exo

if [ -f .env ]; then
  export $(echo $(cat .env | sed 's/#.*//g' | xargs) | envsubst)
else
  echo "Could not find the .env file"
  exit 1
fi
D=$(date +%s)
docker exec -i mongo-db /usr/bin/mongodump --port ${MONGO_DB_PERS_PORT_INT} --db ${MONGO_DB_PERS_DB} --out /dump-${D}
mkdir -p mongodb-dump/
docker cp mongo-db:/dump-${D} mongodb-dump