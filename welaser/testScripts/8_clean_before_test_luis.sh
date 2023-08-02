#!bin/bash
set -exo
sudo find mounts/mongodb ! -name '.dummy' -type f -exec rm -f {} +
