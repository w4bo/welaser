#!/bin/bash
set -exo

if [ -f .env ]; then
  export $(echo $(cat .env | sed 's/#.*//g' | xargs) | envsubst)
else
  echo "Could not find the .env file"
  exit 1
fi

docker exec -i mongo-db /usr/bin/mongodump --port ${MONGO_DB_PERS_PORT_INT} --db ${MONGO_DB_PERS_DB} --out /dump
mkdir -p mongodb-dump
docker cp mongo-db:/dump mongodb-dump