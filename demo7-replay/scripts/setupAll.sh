#!/bin/bash
set -e
set -o xtrace

./scripts/build.sh
./scripts/setupKafka.sh
./scripts/setupFiware.sh
