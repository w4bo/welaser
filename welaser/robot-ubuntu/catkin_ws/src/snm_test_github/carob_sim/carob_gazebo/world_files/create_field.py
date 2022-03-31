# coding=utf-8
import numpy as np
import sys
import os
import json
import argparse

def parse_args(args):
  """ Parse the arguments.
  """
  parser = argparse.ArgumentParser(description="Field Generator (python3)",allow_abbrev=False)
  parser.add_argument('-c', '--col_space', help='Set up the column space. Default: 0.2', type=float, default=0.2)
  parser.add_argument('-r', '--row_space', help='Set up the row space. Default: 0.7', type=float, default=0.7)
  parser.add_argument('-nr', '--nb_rows', help='Set up the number of rows. Default: 20', type=float, default=20)
  parser.add_argument('-nc', '--nb_cols', help='Set up the number of columns. Default: 40', type=float, default=40)

  parser.add_argument('-cm', '--crop_model', help='Setup the crop model. Default: plants', type=str, default='plants')
  parser.add_argument('-f', '--world_name', help='Setup the world name. Default: maize_field_XX.world', type=str, default='maize_field_XX.world')

  parser.add_argument('-wn', '--weed_n_clusters', help='Set up the number of weeds clusters. Default: 7', type=float, default=7)
  parser.add_argument('-wx', '--weeds_x_cluster', help='Set up the number of weeds on each cluster. Default: 20', type=float, default=20)
  parser.add_argument('-wm', '--weed_model', help='Setup the weed model. Default: plants', type=str, default='weeds')

  parser.add_argument('-z', '--z_offset', help='Set up the z offset of the plants. Default: 0', type=float, default=0)

  return check_args(parser.parse_args(args))

def check_args(parsed_args):
  crop_model = {'plants'}
  if parsed_args.crop_model not in crop_model:
    assert parsed_args.crop_model,"Crop model name should be {}".format(crop_model)

  weed_model = {'weeds'}
  if parsed_args.weed_model not in weed_model:
    assert parsed_args.weed_model,"Weed model name should be {}".format(weed_model)

  return parsed_args

if __name__ == "__main__":
  args = parse_args(sys.argv[1:])

  col_space = args.col_space
  row_space = args.row_space
  nb_rows = args.nb_rows
  nb_cols = args.nb_cols
  model = args.crop_model

  model_name = args.world_name
  n_clusters = args.weed_n_clusters
  x_cluster = args.weeds_x_cluster
  weed_model = args.weed_model

  z_offset = args.z_offset
   
  origin_offset = np.array([1.5,0])
  diag_offset = 0

  origin_offset[1] = -1

  x_coord = np.arange(origin_offset[0], origin_offset[0] + (nb_cols * col_space), col_space)
  y_coord = np.arange(origin_offset[1], origin_offset[1] + (nb_rows * row_space), row_space)

  mission = {}
  mission_y = y_coord[1:-1:4]
  mission_x = [x_coord[0],x_coord[-1]]

  cont_name = -1
  cont = 0
  for y in mission_y:
    cont_name+=1
    name = "Point" + str(cont_name)
    mission[name] = [mission_x[cont],y+row_space/2]
    cont+=1
    if cont > 1:
      cont = 0
    cont_name+=1
    name = "Point" + str(cont_name)
    mission[name] = [mission_x[cont],y+row_space/2]

  # Crop model
  crop ="     <model name=\"crop{}\">\n \
          <include>\n \
              <static>true</static>\n \
              <uri>model://{}</uri>\n \
              <pose>{} {} {} 0 0 0</pose>\n \
              <box>\n \
                  <size>10 10 1</size>\n \
              </box>\n \
          </include>\n \
      </model>\n"

  # Weed model
  weed ="     <model name=\"weed{}\">\n \
          <include>\n \
              <static>true</static>\n \
              <uri>model://{}</uri>\n \
              <pose>{} {} {} 0 0 0</pose>\n \
              <box>\n \
                  <size>10 10 1</size>\n \
              </box>\n \
          </include>\n \
      </model>\n"

  output = "<?xml version=\"1.0\" ?>\n \
  <sdf version=\"1.6\">\n \
    <world name=\"default\">\n \
  \n \
      <!-- A global light source -->\n \
      <include>\n \
        <uri>model://sun</uri>\n \
      </include>\n \
  \n \
      <!-- A ground plane -->\n \
      <include>\n \
        <uri>model://ground_dirt</uri>\n \
      </include>\n \
  \n \
      <scene>\n \
        <sky>\n \
          <clouds>\n \
            <speed>12</speed>\n \
          </clouds>\n \
        </sky>\n \
      </scene>\n \
  \n \
      <physics type='ode'>\n \
        <gravity>0 0 -9.8</gravity>\n \
        <ode>\n \
          <solver>\n \
            <type>quick</type>\n \
            <iters>20</iters>\n \
            <sor>1.0</sor>\n \
          </solver>\n \
          <constraints>\n \
            <cfm>0.0</cfm>\n \
            <erp>0.2</erp>\n \
            <contact_max_correcting_vel>100.0</contact_max_correcting_vel>\n \
            <contact_surface_layer>0.0</contact_surface_layer>\n \
          </constraints>\n \
        </ode>\n \
        <max_step_size>0.001</max_step_size>\n \
      </physics>\n"

  # Compteur pour le nom des arbres
  i_crop = 0
  cont = -1
  # Adding crops
  for x in x_coord:
    cont = -1
    for y in y_coord:
      cont+=1
      x_offset = 0.2*np.random.ranf()
      y_offset = 0.1*np.random.ranf()
      output += crop.format(i_crop, model, x + x_offset + (cont*diag_offset), y + y_offset, z_offset)
      i_crop += 1

  #x_loc = np.random.normal(loc=(x_coord[-1] + x_coord[0])/2, scale=1.0, size=n_clusters)
  #y_loc = np.random.normal(loc=(y_coord[-1] + y_coord[0])/2, scale=1.0, size=n_clusters)

  i_weed = 0
  # Adding weeds
  for n in range(n_clusters):
    x_loc = np.random.randint(x_coord[0],x_coord[-1])
    y_loc = np.random.randint(y_coord[0],y_coord[-1]/2)
    x_weed = np.random.normal(loc=x_loc, scale=0.6, size=x_cluster)
    y_weed = np.random.normal(loc=y_loc, scale=0.6, size=x_cluster)
    for m in range(x_cluster):
      output += weed.format(i_weed, weed_model, x_weed[m], y_weed[m], z_offset)
      i_weed += 1

  output += "  </world>\n \
  </sdf>"

  model_path = os.path.abspath(".").split('world_files')[0] + 'worlds/'
  mission_name = 'maize_missionXX.json'
  #model_path = 'crop-world.world'

  # Writing output to file
  with open(model_path + model_name, "w+") as f:
      f.write(output)

  with open(model_path + mission_name, 'w') as f:
      json.dump(mission, f)