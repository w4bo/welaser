#!/usr/bin/env python
from __future__ import division

import os
import sys
import rospy
import roslib
import signal
import time
import numpy as np
from geometry_msgs.msg  import Twist
from nav_msgs.msg import Odometry
from std_msgs.msg import Header, String, Float32
from sensor_msgs.msg import NavSatFix, Image
from tf.transformations import euler_from_quaternion
import json
from carob_fieldnav.msg import RobotStatus, WeedingSystemStatus, RobotSensors, RobotCommand

SEPARATOR_CHAR = "%27"

def normalize(v):
	norm=np.linalg.norm(v, ord=2)
	if norm!=0:
		out = v/norm
	else:
		out = v
	return out

def euclideanDist(p0,p1):
	return np.math.sqrt((p0[0] - p1[0])**2 + (p0[1] - p1[1])**2)

def orthogonalProj(p1,p2,p3,return_distance=False):
	# Return the orthogonal projection of p3 on p1p2
	vX = p2[0]-p1[0]
	vY = p2[1]-p1[1]

	something = ((p3[0]-p1[0])*vX+(p3[1]-p1[1])*vY)/np.math.sqrt(vX**2+vY**2)

	xProj = p1[0] + (something/np.math.sqrt(vX**2+vY**2)) * vX
	yProj = p1[1] + (something/np.math.sqrt(vX**2+vY**2)) * vY
	pProj = np.array([xProj,yProj])
	if return_distance:
		dist = euclideanDist(pProj,p3)
		return pProj, dist
	else:
		return pProj

class carob():

	def __init__(self,mission_path,_id):
		#Creating our node,publisher and subscriber
		rospy.init_node('carob_field_controller', anonymous=True)
		print(_id)
		#Creating Publisher & Subscribers
		self.velocity_publisher = rospy.Publisher('/carob/cmd_vel', Twist, queue_size=10)
		self.pose_subscriber = rospy.Subscriber('/carob/odom', Odometry, self.callback)
		self.current_cmd_vel = Twist()
		self.pose = []
		self.loop = 0.1

		#Sensors Subscribers
		self.gnss_subscriber = rospy.Subscriber('/carob/gps/fix', NavSatFix, self.gnss_callback)
		self.gnss_pose = NavSatFix()
		self.gnss_OK = False
		self.image_subscriber = rospy.Subscriber('/carob/front_camera/image_raw', Image, self.img_callback)
		self.image = Image()
		self.image_OK = False

		self.view_control = 0.5
		self.w_speed = 0.7
		self.l_speed = 0.5
		self.angle_thr = np.math.radians(5)
		self.dist_thr = 0.1

		self.kp_angle = 0.4
		self.kp_lat = 0.5

		self.Kp_d = 1
		self.kp_ra = 1

		self.sleep_time = 1

		self.odom = False
		self.pose = []
		self.last_pose = []

		#Robot Status
		self.RStatus = RobotStatus()
		self.WStatus = WeedingSystemStatus()
		self.RSensors = RobotSensors()

		self.init_status()

		self.timerStatus = rospy.Timer(rospy.Duration(0.1), self.status_callback)
		self.pub_robot_status = rospy.Publisher('/carob-' + _id + '/robotstatus',String, queue_size=10)
		#self.pub_robot_status_state = rospy.Publisher('/carob/state',String, queue_size=10)
		#self.pub_robot_status_status = rospy.Publisher('/carob/status',String, queue_size=10)
		#self.pub_robot_status_speed = rospy.Publisher('/carob/speed',Float32, queue_size=10)

		self.pub_weeding_status = rospy.Publisher('/carob-' + _id + '/weedingstatus',String, queue_size=10)

		self.timerSensors = rospy.Timer(rospy.Duration(1), self.sensors_callback)
		self.pub_robot_sensors_fcamera = rospy.Publisher('/carob-' + _id + '/camera',String, queue_size=10)
		self.pub_robot_sensors_gps = rospy.Publisher('/carob-' + _id + '/gnss',String, queue_size=10)

		self.cmd_subscriber = rospy.Subscriber('/carob-' + _id + '/cmd', String, self.cmd_callback)
		self.status = 'Idle'
		self.messages = {'Idle', 'Stop', 'Continue', 'Running', 'Restart'}
		self.timeout = 1
		self.state = 'Stop'
		self.debug = True

		#mission_path = os.getcwd() + '/maize_mission.json'
		print(mission_path)
		try:
			with open(mission_path, 'r') as j:
				self.mission_data = json.load(j)

				self.mission_points = self.mission_data.keys()
				self.mission_size =len(self.mission_points)
				print 'Mission successful loaded. Mission size: {}'.format(self.mission_size)
		except:
			print 'ERROR loading the Mission'
			sys.exit()

		print 'Welaser mission simulation. It will run cyclically. To stop: Control-C'

		time.sleep(self.loop)
		self.shutdown_var = False

	def init_status(self):
		self.RStatus.header.stamp = time.time()
		self.RStatus.state = 'Idle'
		self.RStatus.command = 'Stop'
		self.RStatus.current_speed = 0.0

		self.WStatus.header.stamp = time.time()
		self.WStatus.state = 'Idle'
		self.WStatus.command = 'Stop'

	def cmd_callback(self, msg):
		#if (abs(Time.now().to_sec() - msg.header.stamp.to_sec()) < self.timeout) or (self.debug == True):
		#	if msg.command in self.messages:
		self.status = msg.data
		#else:
		#	print("ERROR: Message too old")

	def status_callback(self, timer):
		self.RStatus.header.stamp = time.time()
		self.WStatus.header.stamp = time.time()
		self.RStatus.current_speed = self.current_cmd_vel.linear.x

		robot_status = {"header":  self.RStatus.header.stamp,
						"state":   self.RStatus.state,
						"command": self.RStatus.command,
						"speed":   self.RStatus.current_speed
				 	   }

		temp = String()
		temp.data = json.dumps(robot_status).replace('"', SEPARATOR_CHAR)

		self.pub_robot_status.publish(temp)

		weeding_status = {"header":  self.WStatus.header.stamp,
						  "state":   self.WStatus.state,
						  "command": self.WStatus.command
				 	     }

		temp = String()
		temp.data = json.dumps(weeding_status).replace('"', SEPARATOR_CHAR)
		
		self.pub_weeding_status.publish(temp)

		#self.pub_robot_status_state.publish(self.RStatus.state)
		#self.pub_robot_status_status.publish(self.RStatus.command)
		#self.pub_robot_status_speed.publish(self.RStatus.current_speed)

		#self.pub_weeding_status.publish(self.WStatus)

	def sensors_callback(self, timer):
		if self.gnss_OK:
			self.RSensors.header.stamp = time.time()
			gnss_pose = {"header":    self.RSensors.header.stamp,
						 "latitude":  self.gnss_pose.latitude,
						 "longitude": self.gnss_pose.longitude,
						 "altitude":  self.gnss_pose.altitude
				 	    }

			temp = String()
			temp.data = json.dumps(gnss_pose).replace('"', SEPARATOR_CHAR)

			self.pub_robot_sensors_gps.publish(temp)

	#Callback function implementing the odometry value received
	def callback(self, msg):
		self.last_pose = self.pose
		self.odom = False
		self.pose = []
		self.pose.append(round(msg.pose.pose.position.x, 4))
		self.pose.append(round(msg.pose.pose.position.y, 4))

		orientation_q = msg.pose.pose.orientation
		orientation_list = [orientation_q.x, orientation_q.y, orientation_q.z, orientation_q.w]
		(roll, pitch, yaw) = euler_from_quaternion(orientation_list)
		self.pose.append(yaw)
		self.odom = True

	def gnss_callback(self, msg):
		self.gnss_pose = msg
		self.gnss_OK = True

	def img_callback(self, msg):
		self.image = msg
		self.image_OK = True

	def get_pose(self):
		if self.odom == True:
			return self.pose
		else:
			return self.last_pose

	def get_distance(self,pose):
		distance = euclideanDist(np.array(self.goal[0:2]),np.array(pose[0:2]))
		#distance = np.math.sqrt(np.math.pow((self.goal[0] - pose[0]), 2) + np.math.pow((self.goal[0] - pose[1]), 2))
		return distance

	def get_angle_error(self,pose):
		vectCheck = np.array(self.goal[0:2]) - np.array(pose[0:2])
		robotDir = [np.math.cos(pose[2]),np.math.sin(pose[2])]
		angleCheck1 = np.math.atan2(np.linalg.det([robotDir,vectCheck]),np.dot(robotDir,vectCheck))
		return angleCheck1

	def rotate(self,angle):
		self.current_cmd_vel = Twist()
		self.RStatus.command = 'Rotating'
		out = 0

		# Receiveing the user's input
		print "Let's rotate the robot: angle: {0:2f} rad".format(angle)
		
		self.current_cmd_vel.angular.z = np.sign(angle)*self.w_speed

		#self.c_time = time.time()
		pose = self.get_pose()
		angle_goal = pose[2] + angle

		while self.shutdown_var == False:
			time.sleep(self.loop)

			if self.status != 'Running':
				out = 1
				break

			pose = self.get_pose()
			error = pose[2] - angle_goal
			if error > 2*np.pi:
				error = error - 2*np.pi

			if abs(error) > self.angle_thr:
				self.velocity_publisher.publish(self.current_cmd_vel)
				print "\rRotation error: {0:2f}".format(error),
				sys.stdout.flush()
			else:
				print "\nRotation finished with error: {0:2f}".format(error)
				break

		self.velocity_publisher.publish(Twist())
		time.sleep(self.loop)

		return out

	def move(self,init):
		self.current_cmd_vel = Twist()
		self.RStatus.command = 'Moving'
		out = 0

		# Receiveing the user's input
		pose = self.get_pose()
		print "Let's move the robot: distance: {0:2f} m".format(self.get_distance(pose))

		vectCheck = np.array(self.goal[0:2]) - init

		while self.shutdown_var == False:
			time.sleep(self.loop)

			if self.status != 'Running':
				out = 1
				break

			pose = self.get_pose()
			dist_error = self.get_distance(pose)
			Check = np.array(self.goal[0:2]) - np.array(pose[0:2])
			robotDir = normalize([np.math.cos(pose[2]),np.math.sin(pose[2])])
			angleCheck = np.math.atan2(np.linalg.det([robotDir,Check]),np.dot(robotDir,Check))
			reached = False

			if angleCheck<=np.math.radians(90) and angleCheck>=np.math.radians(-90): #in front
				if dist_error < self.dist_thr:
					reached = True
			else:
				reached = True

			if reached == True:
				print "\nMovement finished with error: {0:2f}".format(dist_error)
				break
			else:
				#Translate the control point a little bit ahead of the robot
				tspoint = np.array(pose[0:2]) + robotDir*self.view_control

				pProj, lateral_distance = orthogonalProj(init,np.array(self.goal[0:2]),tspoint,return_distance=True)

				alfa = np.math.atan2(np.linalg.det([robotDir,vectCheck]),np.dot(robotDir,vectCheck))

				ProjCheck = np.array(pose[0:2]) - pProj
				angleCheck = np.math.atan2(np.linalg.det([vectCheck,ProjCheck]),np.dot(vectCheck,ProjCheck))

				if angleCheck != 0:
					direc2 = np.sign(angleCheck)
				else:
					direc2 = 1

				direc = direc2*(-1)

				angle = alfa*self.kp_angle + lateral_distance*direc*self.kp_lat

				w_speed = angle*self.Kp_d
				l_speed = self.l_speed*np.math.cos(np.abs(w_speed)*self.kp_ra)
				if l_speed < 0: l_speed = l_speed*(-1)

				self.current_cmd_vel.linear.x = l_speed
				self.current_cmd_vel.angular.z = w_speed

				self.velocity_publisher.publish(self.current_cmd_vel)

				print "\rDistance error: {0:2f}".format(dist_error),
				sys.stdout.flush()

		self.velocity_publisher.publish(Twist())
		time.sleep(self.sleep_time)

		return out

	def control(self):
		cont = -1

		time.sleep(self.sleep_time)

		while self.shutdown_var == False:
			time.sleep(self.sleep_time)
			pose = self.get_pose()
			if len(pose) == 0:
				self.RStatus.command = 'WaitingForRobot'
			else:
				self.RStatus.command = 'RobotReady'
				break

		while self.shutdown_var == False:

			time.sleep(self.sleep_time)

			if self.status == 'Restart':
				cont=-1
				self.status = 'Running'
				self.state = 'Stop'

			elif self.status == 'Stop':
				print 'Mission Stopped'
				self.RStatus.state = 'Stop'
				self.WStatus.state = 'Stop'
				self.RStatus.command = 'MissionFinished'
				self.WStatus.command = 'Stop'
				self.status = 'Idle'

			elif self.status == 'Continue':
				self.status = 'Running'
			
			if self.status == 'Running':

				self.RStatus.state = 'Running'
				self.WStatus.state = 'Active'

				if cont == self.mission_size:
					self.velocity_publisher.publish(Twist())
					time.sleep(self.sleep_time)

					print 'Mission Finished'
					self.status = 'Stop'
					self.state ='Stop'
					cont = -1

				else:

					if self.state == 'Stop':
						cont+=1
						self.state = 'Turn'

					if cont == 0:
						print 'Mission Started'
					elif cont == self.mission_size:
						continue
					else:
						print 'Mission Continue {}/{}'.format(cont+1,self.mission_size)

					self.goal = self.mission_data[self.mission_points[cont]]
					print "Goal Point: {}".format(self.goal)
					
					if self.state == 'Turn':
						pose = self.get_pose()
						a_error = self.get_angle_error(pose)
						out = 0

						if abs(a_error) > self.angle_thr:
							out = self.rotate(a_error)

						if out == 0:
							self.state = 'Move'
							time.sleep(self.sleep_time)

							if (cont % 2) == 0:
								self.WStatus.command = 'Stop'
							else:
								self.WStatus.command = 'Killing'

					if self.state == 'Move':
						pose = self.get_pose()
						d_error = self.get_distance(pose)
						out = 0

						if abs(d_error) > self.dist_thr:
							pose = self.get_pose()
							init = np.array(pose[0:2])
							out = self.move(init)

						if out == 0:
							self.state = 'Stop'
							self.WStatus.command = 'Stop'

				self.velocity_publisher.publish(Twist())

		time.sleep(self.sleep_time)

	def keyboardInterruptHandler(self,signal,frame):
		self.shutdown_var = True

if __name__ == '__main__':

	#Testing our function

	x = carob(sys.argv[1],sys.argv[2])

	signal.signal(signal.SIGINT, x.keyboardInterruptHandler)

	x.control()

	time.sleep(1.0)
