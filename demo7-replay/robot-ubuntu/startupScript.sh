#!/bin/bash

source /opt/ros/kinetic/setup.bash
cd catkin_ws
catkin_make
chmod -R 777 *
source devel/setup.bash

uuid=$(uuidgen)

sed -i "s/carob/carob-$uuid/g" src/snm_test_github/firos/config/robots.json

roslaunch carob_fieldnav carob_fieldnav.launch id:=$uuid &>/dev/null &

sleep 10

curl --location --request POST "http://${ORION_IP}:${ORION_PORT}/v2/entities/carob-${uuid}/attrs" \
  --header 'Content-Type: application/json' \
  --data-raw '{
  "Domain": {"value": "'"${DOMAIN}"'"},
  "Mission": {"value": "'"${MISSION}"'"}
}'
