#!/bin/bash
set -exo
./scripts/build.sh
./scripts/setupKafka.sh
./scripts/setupFiware.sh
