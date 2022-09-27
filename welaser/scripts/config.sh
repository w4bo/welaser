#!/bin/bash
set -exo

git submodule update --recursive
git submodule update --init --recursive

DEFIP=$(hostname -I | cut -d' ' -f1)
IP=${1:-$DEFIP}

cp .env.example .env
sed -i "s/127.0.0.1/$IP/g" .env
sed -i 's+/path/to/code/here+'$(pwd)'+g' .env

# Devices python
rm devices-python/carob-1.json || true
ln welaser-datamodels/AgriRobot/examples/carob-1.json devices-python/carob-1.json
rm devices-python/img01.png || true
ln devices/src/main/resources/img01.png devices-python/img01.png

# Devices
rm devices/src/main/resources/datamodels/*.json || true
find welaser-datamodels -iname "*.json" -type f -exec ln "{}" devices/src/main/resources/datamodels/ \;
rm devices/src/main/resources/datamodels/package*.json # these are not entities
rm devices/src/main/resources/datamodels/renovate*.json # these are not entities
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
