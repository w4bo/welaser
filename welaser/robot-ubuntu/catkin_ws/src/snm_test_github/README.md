This repository contains a Robot Operating System (ROS) implementation of the Carob AGC robot model to test FIROS & FIWARE implementation. It consists of a single robot that sends status messages from the robot and tool, as well as messages from the on-board sensors (GNSS pose and front camera RGB raw image).

In addition, the robot is capable of receiving commands to control the mission. The commands that the robot supports are the following:
'Idle', 'Stop', 'Continue', 'Running', 'Restart'.

The command message consists of a single string.

## Prerequisites

Tested with ROS kinetic

1. [Ubuntu](https://www.ubuntu.com/) OS or [debian](https://www.debian.org/distrib/)

2. Robot Operating System (ROS). Installation instructions can be found [here](http://wiki.ros.org/ROS/Installation). 

3. Gazebo (installed with ROS Desktop-Full instalation)

4. hector_gazebo_plugins. Installation instructions can be found [here](http://wiki.ros.org/hector_gazebo_plugins).

Common installation:
```sh
$ sudo apt-get install ros-ROSDISTRO-hector-gazebo-plugins
```
ROSDISTRO is your ROS distribution (kinetic, melodic, etc.)

### Steps to launch the simulation

#### Step 1 Update and upgrade the Workspace image
##### in terminal:
```sh
$ sudo apt-get update
$ sudo apt-get upgrade
```

#### Step 2 Create the catkin workspace
##### in terminal:
```sh
$ mkdir -p $HOME/catkin_ws/src
$ cd $HOME/catkin_ws/src
$ git clone ------
```

#### Step 3 Download and incorporate the robot model
Download the files that describe the model (meshes) in [here](https://saco.csic.es/index.php/s/ZjF8FKsQa3dpWWY)

Unzip the folder in $HOME/catkin_ws/src/snm_test/carob_sim/carob_description/

The carob_description directory should be as follows:
```sh
carob_description/
├── carob_1.rviz
├── CMakeLists.txt
├── materials
│   └── textures
│       ├── Logo.jpg
│       └── terrain_ground.png
├── meshes
│   ├── antenna_3GO16.stl
│   ├── Barra.stl
│   ├── Cabina.stl
│   ├── CajaLaser.stl
│   ├── Caja.stl
│   ├── ChasisDerecho.stl
│   ├── ChasisIzquierdo.stl
│   ├── hokuyo.dae
│   ├── Logo.stl
│   ├── Oruga.stl
│   └── Soporte.stl
├── package.xml
└── urdf
    ├── carob_proto1.gazebo
    └── carob_proto1.xacro
```

#### Step 4 Compile the code
##### in terminal:
```sh
$ cd $HOME/catkin_ws
$ catkin_make
$ source devel/setup.bash
```

#### Step 5 Configure the firos instance 

Before continuing, make sure you have an instance of the contextbroker running

Configure the config.json file in /firos/config/ with the contextbroker parameters (address & port)

You also need to define the ip interface of the computer where Firos is running, so that it is able to receive the messages from the conext broker (interface)

#### Step 6 Run the Simulation 
##### in terminal:
```sh
$ source $HOME/catkin_ws/devel/setup.bash
$ roslaunch carob_fieldnav carob_fieldnav.launch

```
This command launches all nodes related to simulation, mission execution and FIROS.

As default configuration, FIROS is launched. To not launch, set input argument to false, as follows:

```sh
$ roslaunch carob_fieldnav carob_fieldnav.launch firos:=false

```

##### For Gazebo graphical interface
As default configuration, the simulator's graphical interface is not launched.

To to load the gazebo models, it is necessary to include the folder where these models are located in the gazebo environment variable, as follows:
```sh
$ export GAZEBO_MODEL_PATH="~/catkin_ws/src/snm_test_github/carob_sim/carob_gazebo/models:$GAZEBO_MODEL_PATH"
```

Be sure about the proper path.


To launch the gui, add the gui argmuent, as follows:
```sh
$ source $HOME/catkin_ws/devel/setup.bash
$ roslaunch carob_fieldnav carob_fieldnav.launch gui:=true

```

By default an empty world is loaded
To load some model inside the folder carob_gazebo/worlds/ without the .world extension
```sh
$ roslaunch carob_fieldnav carob_fieldnav.launch world:=FILENAME
```
World files:
```sh
empty: an empty world
empty_field: an empty field (with a dirt ground)
maize_field_n: a field populated with some maize crops (several version tests)
maize_for_video: a field populated with some maize crops and weeds, used for creating a first video
```

Input arguments can be concatenated.

#### Step 7 Configure the Context broker to send messages to FIROS
FIROS is not able to configure inbound messages in the context broker.

So, for the command message (cmd) it is necessary to first create the entity manually.

To do this, the following command should be executed:
##### in terminal:
```sh
curl CONTEXTBROKER:1026/v2/entities/carob/attrs -s -S --header 'Content-Type: application/json' \
    -X POST -d @- <<EOF
{
  "cmd": {
    "value": "Idle",
    "type": "std_msgs.msg.String"
  }
}
EOF
```
where CONTEXTBROKER is the IP address of the context broker

#### Step 8 Send commands to the robot
As described above, the robot is capable of receiving basic commands.

The command message (cmd) consists of a single string and can be: 'Idle', 'Stop', 'Continue', 'Running', 'Restart'.

Once the entity is created, to update the value of the entity so that FIROS receives it, the following command should be executed:
##### in terminal:
```sh
curl CONTEXTBROKER:1026/v2/entities/carob/attrs/ -s -S --header 'Content-Type: application/json' \
    -X PUT -d @- <<EOF
{
  "cmd": {
    "metadata": {},
    "value": "{%27firosstamp%27: TIMESTAMP, %27data%27: %27CMD%27}",
    "type": "std_msgs.msg.String"
    },
  "COMMAND": {
    "type": "COMMAND",
    "value": ["cmd"]
    }
}
EOF
```
where CONTEXTBROKER is the IP address of the context broker

where TIMESTAMP is the current timestamp. Example: 1633948251.530558

and, CMD is the command. Example: Running (without quotation marks)

Both to create the entity and to update its value, it is possible to observe comments in the terminal where Firos is launched.

Examples of these messages with proper values can be found in the file commands.txt

(Deprecated)
#### Extra configuration
To receive commands, the controller checks the message header. If the message is old (< 1 seg) it is discarded.

By default this configuration is disabled. If you want to check the synchronization of timestamps, you can enable this by changing (set to False) _self.debug_ variable in file /snm_test/carob_fieldnav/src/carob_field_nav.py.

