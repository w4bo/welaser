#!/bin/sh
set -e

MISSION_NAME=$1
DOMAIN_NAME=$2
CODE_FOLDER=$3

S=$(date +%s)
cd $CODE_FOLDER/devices
java -cp build/libs/devices-all.jar it.unibo.devices.MissionSimulator --mission ${MISSION_NAME} --domain ${DOMAIN_NAME} &>../logs/missionmanager-$S-${DOMAIN_NAME}-${MISSION_NAME}-devices.txt &
cd ..
robot-ubuntu/launcher.sh ${DOMAIN_NAME} ${MISSION_NAME} 1 &>logs/missionmanager-$S-${DOMAIN_NAME}-${MISSION_NAME}-robot.txt &