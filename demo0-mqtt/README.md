# MQTT Broker

## Create a user and a password

```sh
sudo docker run -v $(pwd)/mosquitto:/mosquitto -it eclipse-mosquitto sh
cd mosquitto/config
mosquitto_passwd -c pwfile <user> <pwd>
```

## Launch

```sh
docker-compose up
```

By default the MQTT broker is exposed on port 1883.
You can edit `MOSQUITTO_PORT_EXT` in `.env` to specify another port

##  Test

Register a subscriber
```sh
docker run -it --rm efrecon/mqtt-client sub -h <ip> -p 1883 -t "foo" -u <user> -P <pwd>
```

Publish some messages
```sh
docker run -it --rm efrecon/mqtt-client pub -h <ip> -p 1883 -t "foo" -m "bar" -u <user> -P <pwd>
```
