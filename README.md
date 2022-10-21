# WeLASER

[![Build](https://github.com/w4bo/welaser/actions/workflows/build.yml/badge.svg)](https://github.com/w4bo/welaser/actions/workflows/build.yml)
[![Lines of Code](https://sonarcloud.io/api/project_badges/measure?project=w4bo_welaser&metric=ncloc)](https://sonarcloud.io/summary/new_code?id=w4bo_welaser)
[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=w4bo_welaser&metric=sqale_rating)](https://sonarcloud.io/summary/new_code?id=w4bo_welaser)

## Set up

This project requires Java 11 and Python 3.8.
Refer to this [Github action](https://github.com/w4bo/welaser/blob/master/.github/workflows/build.yml) for the complete setup.

To do the mandatory configuration, run:

```sh
scripts/config.sh
```

Check the variables from the `.env` and `webserver/public/env.js` files and change IPs (if needed).

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

By default the MQTT broker is exposed on port `${MOSQUITTO_PORT_EXT}`.
You can edit it in `.env`.

Register a subscriber

```sh
docker run -it --rm efrecon/mqtt-client sub -h ${MOSQUITTO_IP} -p ${MOSQUITTO_PORT_EXT} -t "foo" -u ${MOSQUITTO_USER} -P ${MOSQUITTO_PWD}
```

Publish some messages

```sh
docker run -it --rm efrecon/mqtt-client pub -h ${MOSQUITTO_IP} -p ${MOSQUITTO_PORT_EXT} -t "foo" -m "bar" -u ${MOSQUITTO_USER} -P ${MOSQUITTO_PWD}
```

## Starting the architecture

Execute all the containers

```sh
./launch.sh
```

Shut down the environment

```sh
./stop.sh
``` 

To re-build and restart a single container

```sh
scripts/restartService.sh containername
```

Where `containername` is picked from the `docker-compose.yml` file.
