#!/bin/bash
set -exo
git submodule update --init --recursive
git pull --recurse-submodules