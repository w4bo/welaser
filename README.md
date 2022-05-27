# WeLASER

[![Build](https://github.com/w4bo/welaser/actions/workflows/build.yml/badge.svg)](https://github.com/w4bo/welaser/actions/workflows/build.yml)

## Set up

This projects has been tested with Java 11 and Python 3.8.
Refer to [this Github action](https://github.com/w4bo/welaser/blob/master/.github/workflows/build.yml) to check the complete set up.

To do the mandatory configuration, run:

```sh
scripts/config.sh
```

Check the variables from the `.env` and `webserver/public/env.js` files and change IPs from `127.0.0.1` to the proper ip (if needed).

### (Optional) Mosquitto MQTT

To create a user and a password
```sh
docker run -v $(pwd)/mosquitto:/mosquitto -it eclipse-mosquitto sh
```
and from within the container
```sh
cd mosquitto
mosquitto_passwd -c pwfile <user>
```
Where `<user>` and `<pwd>` corresponds to `MOSQUITTO_USER` and `MOSQUITTO_PWD` variables defined in `.env`

By default the MQTT broker is exposed on port 1883.
You can edit `MOSQUITTO_PORT_EXT` in `.env` to specify another port

Register a subscriber
```sh
docker run -it --rm efrecon/mqtt-client sub -h ${MOSQUITTO_IP} -p ${MOSQUITTO_PORT_EXT} -t "foo" -u ${MOSQUITTO_USER} -P ${MOSQUITTO_PWD}
```

Publish some messages
```sh
docker run -it --rm efrecon/mqtt-client pub -h ${MOSQUITTO_IP} -p ${MOSQUITTO_PORT_EXT} -t "foo" -m "bar" -u ${MOSQUITTO_USER} -P ${MOSQUITTO_PWD}
```

## Interacting with the demo

Bring up all the required containers

```sh
./launch.sh
```

The GUI is available at `IP:8080`.

The following command returns the entity status

```sh
watch -n1 "curl -X GET "${IP}:${ORION_PORT_EXT}/v2/entities?options=keyValues&limit=1000" -H "fiware-service: ${FIWARE_SERVICE}" -H "fiware-servicepath: ${FIWARE_SERVICEPATH}" | python -m json.tool"
```

Shut down the environment

```sh
./stop.sh
``` 

Restart (and build) a single container

```sh
scripts/restartService.sh containername
``` 
Where `containername` name is picked from the `docker-compose.yml` file.
