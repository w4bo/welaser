#!/bin/bash
set -exo

DEFIP=$(hostname -I | cut -d' ' -f1)
IP=${1:-$DEFIP}

find . -path ./mongodb -prune -o -type f -iname "*.sh" -exec chmod +x {} \;
find . -path ./mongodb -prune -o -name \.env -type f -exec rm {} \;

cp .env.example .env
sed -i "s/127.0.0.1/$IP/g" .env
sed -i 's+/path/to/code/here+'$(pwd)'+g' .env

. scripts/loadEnv.sh
python -c 'import os; import json; print("config = " + json.dumps(({k: v for k, v in os.environ.items() if "_EXT" in k or "_IP" in k})))' > service-dashboard/public/env.js

if [ -f "scripts/updatePwd.sh" ]; then
    . ./scripts/updatePwd.sh
fi

# Devices python
rm devices-python/carob-1.json || true
ln welaser-datamodels/AgriRobot/examples/carob-1.json devices-python/carob-1.json
rm devices-python/*.png || true
rm devices-python/*.jpg || true
ln devices/src/main/resources/robotimages/*.jpg devices-python/
ln devices/src/main/resources/robotimages/*.png devices-python/

# Devices
rm devices/src/main/resources/datamodels/*.json || true
rm devices/src/main/resources/datamodels/urn:ngsi-ld:AgriFarm:6991ac61-8db8-4a32-8fef-c462e2369055/*.json || true
find welaser-datamodels -iname "*.json" -type f -exec ln "{}" devices/src/main/resources/datamodels/urn:ngsi-ld:AgriFarm:6991ac61-8db8-4a32-8fef-c462e2369055/ \;
rm devices/src/main/resources/datamodels/urn:ngsi-ld:AgriFarm:6991ac61-8db8-4a32-8fef-c462e2369055/package*.json  # these are not entities
rm devices/src/main/resources/datamodels/urn:ngsi-ld:AgriFarm:6991ac61-8db8-4a32-8fef-c462e2369055/renovate*.json  # these are not entities
ls devices/src/main/resources/datamodels/urn:ngsi-ld:AgriFarm:6991ac61-8db8-4a32-8fef-c462e2369055/ > devices/src/main/resources/datamodels/urn:ngsi-ld:AgriFarm:6991ac61-8db8-4a32-8fef-c462e2369055/filelist.txt

# Copy the .env file where needed
ln .env devices/.env
ln .env service-dashboard/.env
ln .env service-kafkaproxy/.env

# Mosquitto
cp mosquitto/pwfile.example mosquitto/pwfile
