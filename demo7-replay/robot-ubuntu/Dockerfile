FROM dorowu/ubuntu-desktop-lxde-vnc:xenial

#RUN rm /bin/sh && ln -s /bin/bash /bin/sh
SHELL ["/bin/bash", "-c"]

#USER ubuntu
# install utils and upgrade the system
RUN apt update
RUN apt install byobu curl nano vim htop inetutils-ping -y 
RUN apt upgrade -y 
RUN sh -c 'echo "deb http://packages.ros.org/ros/ubuntu $(lsb_release -sc) main" > /etc/apt/sources.list.d/ros-latest.list'  
RUN curl -s https://raw.githubusercontent.com/ros/rosdistro/master/ros.asc | sudo apt-key add -  
RUN apt-get update

RUN apt-cache search ros-kinetic
RUN apt-get install ros-kinetic-ros-base -y
RUN apt-get install python-rosdep python-rosinstall python-rosinstall-generator python-wstool build-essential -y 
RUN apt-get install ros-kinetic-hector-gazebo-plugins -y
# GAZEBO https://medium.com/@abhiksingla10/setting-up-ros-kinetic-and-gazebo-8-or-9-70f2231af21a
RUN apt-get install ros-kinetic-catkin -y
RUN apt-get install rviz -y
RUN apt-get install ros-kinetic-controller-manager ros-kinetic-joint-state-controller ros-kinetic-joint-trajectory-controller ros-kinetic-rqt ros-kinetic-rqt-controller-manager ros-kinetic-rqt-joint-trajectory-controller ros-kinetic-ros-control ros-kinetic-rqt-gui -y
RUN apt-get install libeigen3-dev ros-kinetic-image-view ros-kinetic-parrot-arsdk libprotobuf-dev libprotoc-dev ros-kinetic-joy-teleop ros-kinetic-nav-msgs ros-kinetic-mav-msgs libyaml-cpp-dev ros-kinetic-nodelet ros-kinetic-mav-planning-msgs ros-kinetic-urdf ros-kinetic-image-transport ros-kinetic-roslint ros-kinetic-angles ros-kinetic-cv-bridge ros-kinetic-tf2-geometry-msgs ros-kinetic-xacro ffmpeg libavcodec-dev libavformat-dev libavutil-dev libswscale-dev ros-kinetic-camera-info-manager ros-kinetic-cmake-modules ros-kinetic-gazebo-msgs ros-kinetic-mavros-msgs ros-kinetic-control-toolbox ros-kinetic-mav-msgs ros-kinetic-libmavconn ros-kinetic-mavros ros-kinetic-octomap-msgs ros-kinetic-geographic-msgs ros-kinetic-mavlink ros-kinetic-mavros-extras ros-kinetic-mav-planning-msgs ros-kinetic-joy -y
RUN apt-get install ros-kinetic-rqt-plot ros-kinetic-rqt-graph ros-kinetic-rqt-rviz ros-kinetic-rqt-tf-tree ros-kinetic-joint-state-publisher ros-kinetic-robot-state-publisher -y

RUN apt-get install uuid-runtime

RUN sh -c 'echo "deb http://packages.osrfoundation.org/gazebo/ubuntu-stable `lsb_release -cs` main" > /etc/apt/sources.list.d/gazebo-stable.list'
RUN wget http://packages.osrfoundation.org/gazebo.key -O - | sudo apt-key add -
# RUN sh -c 'echo "deb http://packages.ros.org/gazebo/ubuntu-stable `lsb_release -cs` main" /etc/apt/sources.list.d/ros-stable.list'
# RUN wget http://packages.ros.org/ros.key -O - | sudo apt-key add -

RUN apt-get update
RUN apt-cache search ros-kinetic-gazebo9-ros-pkgs ros-kinetic-gazebo9-ros-control ros-kinetic-gazebo9-plugins ros-kinetic-gazebo9*
RUN apt-get install ros-kinetic-gazebo9-ros-pkgs ros-kinetic-gazebo9-ros-control ros-kinetic-gazebo9-plugins ros-kinetic-gazebo9* -y
RUN apt-get install libgazebo9 libgazebo9-dev -y

RUN rm -rf /etc/ros/rosdep/sources.list.d/20-default.list 
RUN rosdep init
RUN rosdep update

COPY . .
