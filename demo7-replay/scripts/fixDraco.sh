#!/bin/bash
set -e

BEHAVIOR=$1

if [ -f .env ]; then
  export $(echo $(cat .env | sed 's/#.*//g' | xargs) | envsubst)
else
  echo "Could not find the .env file"
  exit 1
fi

cd draco/nifi_volume_demo7/conf

if [ "$BEHAVIOR" == "ota" ]; then
  # from orig to actual
  gzip -dk orig.flow.xml.gz
  mv orig.flow.xml flow.xml
  sed -i 's/!KAFKA_IP_PORT!/'${KAFKA_IP}':'${KAFKA_PORT_EXT}'/g' flow.xml
  gzip -k flow.xml
elif [ "$BEHAVIOR" == "ato" ]; then
  # from actual to orig
  gzip -dk flow.xml.gz
  mv flow.xml orig.flow.xml
  sed -i 's/'${KAFKA_IP}':'${KAFKA_PORT_EXT}'/!KAFKA_IP_PORT!/g' orig.flow.xml
  gzip -k orig.flow.xml
else
  echo "Unknown parameter $BEHAVIOR; valid parameters are ato (from actual to original) or ota (original to actual)"
  exit 1
fi

cd -
exit 0