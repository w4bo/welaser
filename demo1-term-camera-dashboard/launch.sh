#!/bin/bash
set -e
set -o xtrace

NUM_THERM=$1
NUM_CAMERA=$2

./setupFiware.sh
./createDevices.sh ${NUM_THERM} ${NUM_CAMERA} &>/dev/null
