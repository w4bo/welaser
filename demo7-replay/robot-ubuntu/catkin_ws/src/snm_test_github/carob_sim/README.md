This repository contains a Robot Operating System (ROS) implementation of the Carob AGC robot model for uses with the ROS navigation stack.
2 versions of the robot are available: 

# carob & carob_full
                                         
<a href="url"><img src="http://gitlab.fsr.car.upm-csic.es/uploads/-/system/personal_snippet/8/65280cb248814fe1051697b3acfd43d4/Carob.png" ></a> <a href="url"><img src="http://gitlab.fsr.car.upm-csic.es/uploads/-/system/personal_snippet/8/24c89f65cbd6422597be5dcc9f7ca5d6/Carob_full.png" ></a> 

## Prerequisites

1. [Ubuntu](https://www.ubuntu.com/) OS or [debian](https://www.debian.org/distrib/)

2. Robot Operating System (ROS). Installation instructions can be found [here](http://wiki.ros.org/ROS/Installation). 


### Steps to launch the simulation

#### Step 1 Update and upgrade the Workspace image
```sh
$ sudo apt-get update
$ sudo apt-get upgrade
```

#### Step 2 Create the catkin workspace
```sh
$ mkdir -p $HOME/catkin_ws/src
$ cd $HOME/catkin_ws/src
$ git clone git@gitlab.fsr.car.upm-csic.es:welaser/carob-sim.git
```

#### Step 3 Compile the code
```sh
$ cd $HOME/catkin_ws
$ catkin_make
$ source devel/setup.bash
```

#### Step 4 Run the Simulation 
##### in terminal:

```sh
$ source $HOME/catkin_ws/devel/setup.bash
$ roslaunch carob_gazebo carob.launch

```
By default an empty world is loaded
To load some model inside the folder carob_gazebo/worlds/ without the .world extension
```sh
$ roslaunch carob_gazebo carob.launch world:=FILENAME
```
World files:
```sh
empty.world: an empty world
empty_field.world: an empty field (with a dirt ground)
maize_field_n.world: a field populated with some maize crops (several version tests)
maize_for_video.world: a field populated with some maize crops and weeds, used for creating a first video
```
