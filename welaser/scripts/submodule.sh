#!/bin/bash
set -xo
git submodule update --init --recursive --force
git submodule foreach git pull origin master
git submodule foreach git pull origin main
git pull --recurse-submodules
