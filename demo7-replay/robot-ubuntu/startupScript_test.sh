#!/bin/bash

source /opt/ros/kinetic/setup.bash
cd catkin_ws
catkin_make
chmod -R 777 *
source devel/setup.bash
#export GAZEBO_MODEL_PATH="/src/snm_test_github/carob_sim/carob_gazebo/models:$GAZEBO_MODEL_PATH"
#roslaunch carob_fieldnav carob_fieldnav.launch gui:=true world:=empty_field &>/dev/null &
