#!/bin/bash
git submodule update --init --recursive --force
# git submodule foreach git pull origin master
# git submodule foreach git pull origin main
# git pull --recurse-submodules
for folder in "service-mapbuilder" "service-missionplanner" "service-missionsupervisor" "welaser-datamodels"; do
  echo "$folder"
  cd "$folder"
  git pull origin main
  git pull origin master
  cd -
done
