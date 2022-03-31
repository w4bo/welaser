#!/bin/sh
set -e

MISSION_NAME=$1
DOMAIN_NAME=$2
CODE_FOLDER=$3

cd $CODE_FOLDER/devices
java -cp build/libs/devices-all.jar it.unibo.devices.MissionSimulator --mission ${MISSION_NAME} --domain ${DOMAIN_NAME} &
cd ..
robot-ubuntu/launcher.sh ${DOMAIN_NAME} ${MISSION_NAME} 1 &