# FIWARE + Devices + Dashboard

## Set up

Check the variables from the `.env` and `webserver/public/env.js` files. 
- `IP`: `127.0.0.1` is chosen, the demo will be only reachable within the machine is running on.
- `MOSQUITTO_IP`: IP of the machine running Mosquitto (NOT `127.0.0.1` but the real IP of the machine)
- `ORION_IP`: IP of the machine running Orion Context Broker (NOT `127.0.0.1` but the real IP of the machine)

## Create a user and a password

```sh
docker run -v $(pwd)/mosquitto:/mosquitto -it eclipse-mosquitto sh
cd mosquitto/config
mosquitto_passwd -c pwfile <user> <pwd>
```

Where `<user>` and `<pwd>` corresponds to `MOSQUITTO_USER` and `MOSQUITTO_PWD` variables defined in `.env`

## Build

```sh
./build.sh
```

This will build images for both FIWARE and devices.

## Interacting with the demo

Bring up all the containers

```sh
./launch.sh <n-thermometers> <n-cameras>
```

For instance

```sh
./launch.sh 10 2
```

or

```sh
./launch.sh 1 0
```

1. Access the WEB GUI at `<IP>:8080` (e.g., `<IP>:8080`) to see sensors' information
2. Stop the demo with `./stop.sh`

## Sending MQTT data

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
