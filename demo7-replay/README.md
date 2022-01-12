# FIWARE

## Set up

Check the variables from the `.env` and `webserver/public/env.js` files.
- `IP`: 127.0.0.1 is chosen, the demo will be only reachable within the machine is running on.
- `MOSQUITTO_IP`: IP of the machine running Mosquitto (NOT 127.0.0.1 but the real IP of the machine)
- `ORION_IP`: IP of the machine running Orion Context Broker (NOT 127.0.0.1 but the real IP of the machine)
- `USER`: the user running the demo, required by ssh (see below)
- `CODE_FOLDER`: used to execute necessary scripts (starting from the user's home)  

Also, in Draco:
- To store data in HDFS, upload the `core-site.xml` and `hdfs-site.xml` in `draco/config/`. The path in which data is stored is found in the `PutHDFS` block. By default is `/user/fiware/camera/${domain}/${mission}/${id}/`
- To write data to Kafka, stop the Kafka blocks and update the IPs in the configurations (see below)
    1. Note that an original configuration of Draco is located in `draco/nifi_volume_demo7/conf/orig.flow.xml`
    2. To create a working Draco configuration, run `scripts/fixDraco.sh ota`. In this way, the draco configuration will be aligned with the variables in the `.env` file
    3. If changes to the flow are made, you must update the Draco flow by running `scripts/fixDraco.sh ato`
- By default, Draco is configured in a *read-only* mode; i.e., changes in the flow are not persisted. Please check the `docker-compose.yml` to enable persistence (it is a matter of un/commenting a few rows)

### Create a user and a password
```sh
docker run -v $(pwd)/mosquitto:/mosquitto -it eclipse-mosquitto sh
cd mosquitto/config
mosquitto_passwd -c pwfile <user> <pwd>
```

Where `<user>` and `<pwd>` corresponds to `MOSQUITTO_USER` and `MOSQUITTO_PWD` variables defined in `.env`

### ssh

The mission manager creates the devices by connecting to the current machine with SSH (so that devices do not run on the container of the mission manager). For this to work, you need to:

- Generate the SSH keys in `.ssh/`
- Run the command `ssh-copy-id USER@IP`
- Make sure that this works by logging in to IP through SSH (i.e., log in with `ssh USER@IP` should not require any password)

### Kafka 

1. Access `IP:9090`
2. Stop all the running processes. Press "ctrl+a" to select all the processes and press the "stop" button
3. Edit all the "PublishKafka_\*" processes. edit "Kafka Brokers" in the properties tab
4. Start the processes again. Press "ctrl+a" to select all the processes and press the "play" button
  
## Interacting with the demo

Bring up all the required containers

```sh
./launch.sh
```
The GUI is available at `IP:8080`.

The following command returns the entity status

```sh
watch -n1 "curl -X GET 'IP:IOTA_NORTH_PORT/iot/devices' -H 'fiware-service: openiot' -H 'fiware-servicepath: /' | python -m json.tool"
watch -n1 "curl -X GET 'IP:ORION_PORT_EXT/v2/entities' -H 'fiware-service: openiot' -H 'fiware-servicepath: /' | python -m json.tool"
watch -n1 "curl -X GET 'IP:ORION_PORT_EXT/v2/entities?options=keyValues' -H 'fiware-service: openiot' -H 'fiware-servicepath: /' | python -m json.tool"
```

Shut down the environment

```sh
./stop.sh
``` 

Restart (and build) a single container

```sh
scripts/restartService.sh containername
``` 
Where `containername` name is picked from the docker file.

### Sending MQTT data

The PoC starts with given `<n-thermometers>` and `<n-cameras>`, this means that the FIWARE entities have been already
created in the Orion Context Broker (OCB).

The details of such creation are reported in the following files. Remember, *this creation has already been carried out*
as follows.

1. Create a FIWARE service `setupFiware.sh` (these is necessary for the IoTAgent)
2. Create the FIWARE subscriptions `setupFiware.sh` (these are necessary for the web application)
3. Create an entity for each sensor `devices/thermometerMQTT/launcher.sh`

- Note that, while creating the entity and its attributes, we also defined shortcuts to refer to the attribute names
  ```
    { 
        ...
        { "object_id": "t", "name": "Temperature", "type": "Float" },
        { "object_id": "s", "name": "Status", "type": "Boolean" },
        { "object_id": "time", "name": "Time", "type": "Integer" },
        ... 
    }
  ```

5. Create an entity for each camera `devices/cameraMQTT/launcher.sh`

The following command returns the entity status

```sh
curl --location --request GET 'IP:ORION_PORT_EXT/v2/entities' --header 'fiware-service: openiot' --header 'fiware-servicepath: /' | python -m json.tool
curl --location --request GET 'IP:ORION_PORT_EXT/v2/entities?options=keyValues' --header 'fiware-service: openiot' --header 'fiware-servicepath: /' | python -m json.tool
```

The result is

```

[
    {
        "Status": false,
        "Temperature": 2.5,
        "Time": 1635431235283,
        "id": "urn:ngsi-ld:thermometer:1",
        "type": "Thermometer",
        ...
    }
]

```

### MQTT message

Given the above entity definition, examples of MQTT messages can be found in the following files.

- Thermometer `devices/thermometerMQTT/server.js`
- Camera `devices/cameraMQTT/server.js`

For instance, to send a temperature update, examples of payloads are

```sh
{"t": 37.5} # Here we are sending a temperature value only (i.e., we are updating a single attribute at the time)
{"t": 38.5, "time": 1635433018000} # Here we are sending a temperature value along with the timestamp in ms (i.e., we are updating multiple attributes at the time)
```

Such messages must be sent to the following topic

```sh
/${KEY}/thermometer${ID}/attrs
```

Where

- `KEY` is the service API key (i.e., the default key for this demo `4jggokgpepnvsb2uv4s40d59ov`, this is found
  in `setupFiware.sh`)
- `thermomether${ID}` where id the is number of the thermometer (e.g., `1`)

An example of topic for the thermometer is

```
/4jggokgpepnvsb2uv4s40d59ov/thermometer1/attrs
```

An example of MQTT message sent by an MQTT publisher running on docker is:

```
docker run -it --rm efrecon/mqtt-client pub -h MOSQUITTO_IP -p MOSQUITTO_PORT_EXT -t "/4jggokgpepnvsb2uv4s40d59ov/thermometer1/attrs" -m '{"t": 37.5}' -u MOSQUITTO_USER -P MOSQUITTO_PWD
docker run -it --rm efrecon/mqtt-client pub -h MOSQUITTO_IP -p MOSQUITTO_PORT_EXT -t "/4jggokgpepnvsb2uv4s40d59ov/thermometer1/attrs" -m '{"t": 38.5, "time": 1635433018000}' -u MOSQUITTO_USER -P MOSQUITTO_PWD
```

### HDFS

```sh
hdfs dfs -ls /user/fiware/camera/d1/m1/urn-ngsi-ld-camera-1m1
hdfs dfs -get /user/fiware/camera/d1/m1/urn-ngsi-ld-camera-1m1/urn-ngsi-ld-camera-1m1_20211103110958836.png
```

### Testing collisions

A collision can also be simulated with `pythonCollisionProducer`
```
cd pythonCollisionProducer
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python producer.py
```

Press enter to generate a new random collision, type "quit" to exit.

### Known issues

- Draco changes the access permissions of the `draco/config/` folder, which requires `sudo` privileges to be modified
- The `PutHDFS` requires that the HDFS folder has `777` access permissions. Otherwise, it is necessary to set up Kerberos authentication
- With many cameras, Draco's performance degrades a lot. This is related to the `HTTP Listener` block
- The `replayexecutor` has problems while writing to Kafka. This only happens when the `replayexecutor` is run from a docker container

## TODO

- [FM] Fix collision and spark streaming with .env
- [FM] Add back the support to entity commands
- [FM] Show generic entities
- [?] Delete the entities / devices after stopping the devices
