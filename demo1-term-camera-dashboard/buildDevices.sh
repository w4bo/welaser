#!/bin/bash
set -e
set -o xtrace

docker build -t fiware-device/thermometer ./devices/thermometerMQTT
docker build -t fiware-device/camera ./devices/cameraMQTT
