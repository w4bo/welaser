#!/bin/bash
set -exo

if [ -f .env ]; then
    # export $(echo $(cat .env | sed 's/#.*//g' | xargs) | envsubst)
    export $(cat .env | grep -v '#' | sed 's/\r$//' | awk '/=/ {print $1}')
else
    echo "Could not find the .env file"
    exit 1
fi
