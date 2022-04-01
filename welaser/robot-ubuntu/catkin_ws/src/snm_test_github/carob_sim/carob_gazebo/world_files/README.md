
This repository contains a script and files to configure and create a world for Gazebo

## Prerequisites

1. The python script should be configured according to your request. Check the scrip usage
2. By default, a weed population is also created. This population can be configured. Check the scrip usage.
3. A file with mission points is also created in json format, to be used by the nav_supervisor package.
4. The created world files and mission files are stored in . world

### Steps to launch the simulation

#### Add model folders
```sh
 Folder "ground_grass" contains the ground with Gazebo colour and shapes. Folder "plants" contains the solid of the plant as .stl in this case (you can add whichever Gazebo supports). Folder "weeds" contains the solid of a simulation of weeds as .stl.

 These folders have to be in Gazebo's path (~.gazebo/models). (By the moment)
```

#### Test world
```sh
 You can test the world wherever you want because the path of the files were set when the python script ran for the first time. (Still in development)

```








