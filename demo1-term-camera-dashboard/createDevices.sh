#!/bin/bash
set -e
set -o xtrace

NUM_THERM=$1
NUM_CAMERA=$2

if [ -f .env ]; then
  export $(cat .env | sed 's/#.*//g' | xargs)
else
  echo "Cannot find the .env file, exiting. What?"
  exit 1
fi

for ((i = 1; i <= ${NUM_THERM}; i++)); do
  echo "therm ${i}"
  # devices/thermometerMQTT/launcher.sh ${i} on 1000 1000 &
  devices/thermometerMQTT/launcher.sh ${i} off 1000 1000 &
done

for ((i = 1; i <= ${NUM_CAMERA}; i++)); do
  echo "camera ${i}"
  # devices/cameraMQTT/launcher.sh ${i} on 1000 &
  devices/cameraMQTT/launcher.sh ${i} off 1000 &
done
