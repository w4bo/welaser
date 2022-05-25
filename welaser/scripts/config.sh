#!/bin/bash
set -e
set -xo

# git submodule update --recursive
# git submodule update --init --recursive

DEFIP=$(hostname -I | cut -d' ' -f1)
IP=${1:-$DEFIP}

cp .env.example .env
sed -i "s/127.0.0.1/$IP/g" .env
sed -i 's+/path/to/code/here+'$(pwd)'+g' .env

# Devices
rm devices/src/main/resources/datamodels/*.json || true
find welaser-datamodels -iname "*.json" -type f -exec ln "{}" devices/src/main/resources/datamodels/ \;
ls devices/src/main/resources/datamodels/ > devices/src/main/resources/datamodels/filelist.txt
rm devices/.env || true
ln .env devices/.env

# Mission planner
rm service-missionplanner/mission-123.json || true
ln welaser-datamodels/Task/examples/mission-123.json service-missionplanner/mission-123.json

# Visual dashboard
cp service-dashboard/public/env.js.example service-dashboard/public/env.js
sed -i "s/127.0.0.1/$IP/g" service-dashboard/public/env.js

# Mosquitto
cp mosquitto/pwfile.example mosquitto/pwfile
