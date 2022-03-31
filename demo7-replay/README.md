# FIWARE

## Set up

Check the variables from the `.env` and `webserver/public/env.js` files.
- Change IPs from the 127.0.0.1 to the actual IP

### MQTT create a user and a password

```sh
docker run -v $(pwd)/mosquitto:/mosquitto -it eclipse-mosquitto sh
cd mosquitto/config
mosquitto_passwd -c pwfile <user> <pwd>
```

Where `<user>` and `<pwd>` corresponds to `MOSQUITTO_USER` and `MOSQUITTO_PWD` variables defined in `.env`

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

The PoC starts with thermometers and cameras, this means that the FIWARE entities have been already created in the Orion Context Broker (OCB).

The details of such creation are reported in the following files. Remember, *this creation has already been carried out* as follows.

1. Create a FIWARE service (these is necessary for the IoTAgent; see `setupFiware.sh`)
2. Create the FIWARE subscriptions `setupFiware.sh` (these are necessary to send data to Kafka; see `setupFiware.sh`)
3. Create an entity for each sensor (see `devices/`)

Note that, while creating an MQTT device and its attributes, we also defined shortcuts to refer to the attribute names
  ```
    { 
        ...
        { "object_id": "t", "name": "Temperature", "type": "Float" },
        { "object_id": "s", "name": "Status", "type": "Boolean" },
        { "object_id": "time", "name": "Time", "type": "Integer" },
        ... 
    }
  ```

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

- `KEY` is the service API key (i.e., the default key for this demo `4jggokgpepnvsb2uv4s40d59ov`, this is found in `setupFiware.sh`)
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

### Known issues

- The `replayexecutor` has problems while writing to Kafka. This only happens when the `replayexecutor` is run from a docker container
