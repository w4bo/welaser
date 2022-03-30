#!/bin/bash
set -e

MISSION_NAME=$1
DOMAIN_NAME=$2
CODE_FOLDER=$3

cd $CODE_FOLDER

cd devices
#./gradlew runMission --args="-mission ${MISSION_NAME} -domain ${DOMAIN_NAME}" &>/dev/null &
java -cp build/libs/devices-all.jar it.unibo.devices.MissionSimulator --mission ${MISSION_NAME} --domain ${DOMAIN_NAME} &
cd ..
robot-ubuntu/launcher.sh ${DOMAIN_NAME} ${MISSION_NAME} 1 & # >/dev/null &