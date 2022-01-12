#!/bin/bash
set -e
set -o xtrace

if [ -f .env ]; then
  export $(echo $(cat .env | sed 's/#.*//g' | xargs) | envsubst)
else
  echo "Could not find the .env file"
fi

MISSION_NAME=$1
DOMAIN_NAME=$2
CODE_FOLDER=$3

cd ${CODE_FOLDER}

echo $(pwd)
if [ -f .env ]; then
  export $(echo $(cat .env | sed 's/#.*//g' | xargs) | envsubst)
else
  echo "Could not find the .env file"
fi

devices/cameraMQTT/launcher.sh      1${MISSION_NAME} on $(shuf -i 500-1500 -n 1) "Spain" 40.31231176524012 -3.481042237784891 ${MISSION_NAME} ${DOMAIN_NAME} true & # &>/dev/null
devices/thermometerMQTT/launcher.sh 1${MISSION_NAME} on $(shuf -i 500-1500 -n 1) "Spain" 40.31308266787424 -3.4804348644627585 ${MISSION_NAME} ${DOMAIN_NAME} false & # &>/dev/null
devices/thermometerMQTT/launcher.sh 2${MISSION_NAME} on $(shuf -i 500-1500 -n 1) "Spain" 40.31285012589443 -3.481151470822967 ${MISSION_NAME} ${DOMAIN_NAME} false & # &>/dev/null
devices/thermometerMQTT/launcher.sh 3${MISSION_NAME} on $(shuf -i 500-1500 -n 1) "Spain" 40.31184130935516 -3.4810637987225532 ${MISSION_NAME} ${DOMAIN_NAME} false & # &>/dev/null
robot-ubuntu/launcher.sh ${DOMAIN_NAME} ${MISSION_NAME} 1 &
