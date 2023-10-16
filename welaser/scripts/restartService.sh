#!/bin/bash
set -exo
docker compose stop $@
docker compose rm --force $@
docker compose build --no-cache $@
docker compose up --detach --build --remove-orphans $@
