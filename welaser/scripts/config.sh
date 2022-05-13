#!/bin/bash

DEFIP=$(hostname -I | cut -d' ' -f1)
IP=${1:-$DEFIP}
find welaser-datamodels -iname "*.json" -type f -exec ln "{}" devices/src/main/resources/datamodels/ \;
cp .env.example .env
sed -i "s/127.0.0.1/$IP/g" .env
sed -i 's+/path/to/code/here+'$(pwd)'+g' .env
cp service-dashboard/public/env.js.example service-dashboard/public/env.js
sed -i "s/127.0.0.1/$IP/g" service-dashboard/public/env.js
cp mosquitto/pwfile.example mosquitto/pwfile
