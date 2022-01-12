!/bin/bash

set -e
set -o xtrace

echo $(pwd)
if [ -f .env ]; then
  export $(echo $(cat .env | sed 's/#.*//g' | xargs) | envsubst)
else
  echo "Could not find the .env file"
fi

DOMAIN=${1}
MISSION=${2}
NUM=${3}
NETWORK="demo7-replay_default"

# pass NUM to docker as env variable
docker run \
  --network ${NETWORK} \
  --env ORION_IP=${ORION_IP} \
  --env ORION_PORT=${ORION_PORT_EXT} \
  --env DOMAIN=${DOMAIN} \
  --env MISSION=${MISSION} \
  --name robot_${NUM}_${MISSION} \
  --env-file .env \
  fiware-robot &>/dev/null &

while [ "$(docker ps | grep robot_${NUM}_${MISSION} | wc -l)" != 1 ]
do
  echo "not ready"
  sleep 1
done

docker exec robot_${NUM}_${MISSION} ./startupScript.sh
