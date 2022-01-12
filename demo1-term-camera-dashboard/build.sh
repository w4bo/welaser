#!/bin/bash
set -e
set -o xtrace

docker-compose build
./buildDevices.sh
