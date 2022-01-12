#!/bin/bash
set -e

if [ -f .env ]; then
  export $(echo $(cat .env | sed 's/#.*//g' | xargs) | envsubst)
else
  echo "Could not find the .env file"
  exit 1
fi

cp .env .env.example
FAKEIP='127.0.0.1'
sed -i 's/'${IP}'/'${FAKEIP}'/g' .env.example
sed -i 's/'${KAFKA_IP}'/'${FAKEIP}'/g' .env.example
sed -i 's/'${ORION_IP}'/'${FAKEIP}'/g' .env.example
sed -i 's/'${DRACO_IP}'/'${FAKEIP}'/g' .env.example
sed -i 's/'${PROXY_IP}'/'${FAKEIP}'/g' .env.example
sed -i 's/MOSQUITTO_USER=.*\s*/MOSQUITTO_USER=foo/g' .env.example
sed -i 's/MOSQUITTO_PWD=.*\s*/MOSQUITTO_PWD=bar/g' .env.example
sed -i 's/USER=.*\s*/USER=foo/g' .env.example
sed -i 's/FIWARE_API_KEY=.*\s*/FIWARE_API_KEY=4jggokgpepnvsb2uv4s40d59ov/g' .env.example
sed -i 's/FIWARE_SERVICE=.*\s*/FIWARE_SERVICE=openiot/g' .env.example
sed -i 's/FIWARE_SERVICEPATH=.*\s*/FIWARE_SERVICEPATH=\//g' .env.example