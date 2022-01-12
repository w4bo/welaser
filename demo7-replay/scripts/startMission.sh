#!/bin/bash
set -e
set -o xtrace

if [ -f .env ]; then
  export $(cat .env | sed 's/#.*//g' | xargs)
else
  echo "Cannot find the .env file"
  exit 1
fi

./wait-for-it.sh ${IP}:${ORION_PORT_EXT} --timeout=480 -- echo "OCB is up"

# To create the entity
curl ${IP}:${ORION_PORT_EXT}/v2/entities/carob/attrs -s -S --header 'Content-Type: application/json' \
  -X POST -d @- <<EOF
{
  "cmd": {
    "value": "Idle",
    "type": "std_msgs.msg.String"
  }
}
EOF

sleep 20

# To update the entity
curl ${IP}:${ORION_PORT_EXT}/v2/entities/carob/attrs/ -s -S --header 'Content-Type: application/json' \
  -X PUT -d @- <<EOF
{
  "cmd": {
    "metadata": {},
    "value": "{%27firosstamp%27: $(expr $(date +%s) + 0), %27data%27: %27Running%27}",
    "type": "std_msgs.msg.String"
    },
  "COMMAND": {
    "type": "COMMAND",
    "value": ["cmd"]
    }
}
EOF
