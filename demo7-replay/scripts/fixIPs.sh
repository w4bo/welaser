#!/bin/bash
set -e

sed -i 's/137.204.74.56/10.100.201.6/g' .env
sed -i 's/137.204.74.56/10.100.201.6/g' robot-ubuntu/catkin_ws/src/snm_test_github/firos/config/config.json