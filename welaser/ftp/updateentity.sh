#!/bin/bash
set -eo

function urldecode() { : "${*//+/ }"; echo -e "${_//%/\\x}"; }

if [ -f .env ]; then
    export $(cat .env | grep -v '#' | sed 's/\r$//' | awk '/=/ {print $1}')
else
    export $(cat ../.env | grep -v '#' | sed 's/\r$//' | awk '/=/ {print $1}')
fi

while true; do
    filename=$(inotifywait -e CREATE -r -q --format %f images-dump)
    IFS=- read -r farm id timestamp attr <<< $(echo "$filename")
    farm=$(urldecode "$farm")
    id=$(urldecode "$id")
    timestamp=$(urldecode "$timestamp")
    attr=$(urldecode "$attr")
    # echo "$farm"
    # echo "$id"
    # echo "$timestamp"
    # echo "$attr"
    url="http://${ORION_IP}:${ORION_PORT_EXT}/v2/entities/$id/attrs?options=keyValues"
    payload='{"'$attr'": "http://'${IMAGESERVER_IP}:${IMAGESERVER_PORT_HTTP_EXT}'/'$filename'"}'
    # echo $url
    # echo $payload
    curl -X PATCH "$url" -H 'Content-Type: application/json' -H 'Accept: application/json' -d "$payload"
done
