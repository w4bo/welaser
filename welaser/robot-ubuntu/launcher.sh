#!/bin/sh
set -e
set -o xtrace

if [ -f .env ]; then
  export $(echo $(cat .env | sed 's/#.*//g' | xargs) | envsubst)
else
  echo "Could not find the .env file"
  exit 1
fi

DOMAIN=${1}
MISSION=${2}
NUM=${3}
NETWORK="welaser_default"

# pass NUM to docker as env variable
docker run \
  --env DOMAIN=${DOMAIN} \
  --env MISSION=${MISSION} \
  --name robot_${NUM}_${MISSION} \
  --env-file .env \
  ghcr.io/w4bo/welaser-robot:master &
  # fiware-robot &

while [ "$(docker ps | grep robot_${NUM}_${MISSION} | wc -l)" != 1 ]
do
  echo "not ready"
  sleep 1
done

docker exec robot_${NUM}_${MISSION} ./startupScript.sh
