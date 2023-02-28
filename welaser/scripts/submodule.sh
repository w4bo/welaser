#!/bin/bash
set -exo
git submodule update --init --recursive --force --remote
git pull --recurse-submodules
