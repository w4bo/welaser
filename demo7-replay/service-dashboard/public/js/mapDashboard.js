const mapDashboard = {
    template: `
      <div style="padding: 3%">
      <v-row justify="center" align="center">
        <div>
          <v-switch
            v-model="satelliteVisibility"
            label='Show Satellite'
            v-on:click="toggleSatellite"
          ></v-switch>
        </div>
      </v-row>
      <v-row>
        <v-col cols=10>
          <v-select
            :items="topics"
            item-text="id"
            item-value="topic"
            label="Topic"
            v-model="selectedTopic"
          ></v-select>
        </v-col>
        <v-col cols=2>
          <v-btn
            v-on:click="listenTopic"
            elevation="2"
          >Listen Topic</v-btn>
        </v-col>
      </v-row>
      <v-row>
        <div
          id="map"
          class="map"
          style="width: 100%; height: 600px"
        ></div>
      </v-row>
      <v-row>
        <template v-for="device in Object.values(devices)">
          <v-col cols=4 class="pa-3 d-flex flex-column">
          <v-card class="elevation-5 ma-5 flex d-flex flex-column" :color="device.color">
            <v-card-title class="pb-0">{{device.data.id}}</v-card-title>
              <!--For some strange reasons i need to extract (value,key) instead of (key,value)-->
              <v-card-text class="flex">
                <table style="border: 1px solid black; margin-left: auto; margin-right: auto">
                  <template v-for="(value, key) in device.data">
                    <tr style="border: 1px solid black;" v-if="typeof(value) != 'object'">
                      <th style="border: 1px solid black;">{{key}}</th>
                      <td style="border: 1px solid black;">{{value}}</td>
                    </tr>
                      <tr style="border: 1px solid black;" v-else-if="key == 'Image'">
                        <th style="border: 1px solid black;">{{key}}</th>
                        <td><img :src="'data:image/png;base64,' + value.value" style="height:20vh"></td>
                      </tr>
                    <tr style="border: 1px solid black;" v-else>
                      <th style="border: 1px solid black;">{{key}}</th>
                      <td v-html="renderJSON(value.value)"></td>
                    </tr>
                  </template>
                </table>
              </v-card-text>
              <v-card-actions>
                <template v-for="(value, key) in device.data">
                  <v-btn v-if="value.type=='commandResult'" v-on:click="execute(device.id, key.split('_')[0])"> {{key.split("_")[0]}} </v-btn>
                </template>
                <v-btn v-if="device.data.type=='ROBOT' "v-on:click="executeRobot(device.id, 'Stop')"> Stop </v-btn>
                <v-btn v-if="device.data.type=='ROBOT'" v-on:click="executeRobot(device.id, 'Running')"> Running </v-btn>
                <v-btn v-if="device.data.type=='ROBOT'" v-on:click="executeRobot(device.id, 'Resume')"> Resume </v-btn>
              </v-card-actions>
            </v-card-title>
          </v-card>
          </v-col>
        </template>
      </v-row>
    </div>
  `,
    data() {
        return {
            devices: {},
            collisions: {},
            remoteSocket: null,
            localSocket: null,
            topicName: "",
            socketName: "",
            deviceLocationMap: {},
            collisionLocationMap: {},
            devicePoints: [],
            collisionPoints: [],
            deviceLayer: "",
            collisionPayer: "",
            worldImagery: "",
            map: "",
            satelliteVisibility: true,
            topics: [],
            selectedTopic: "data.canary.realtime",
            colors: ["#5778a4", "#e49444", "#d1615d", "#85b6b2", "#6a9f58", "#e7ca60", "#a87c9f", "#f1a2a9", "#967662", "#b8b0ac"]
        }
    },
    methods: {
        renderJSON(data) {
            if (typeof (data) != "object") {
                if (typeof (data) == "string") {
                    data = data.trim()
                }
                if (data != undefined && data != "" && data != "\n" && data != "UNKNOWN") {
                    //console.log(data)
                    return `${data}`
                }
            } else if (data) {
                html = `
              <table style="border: 1px solid black; width:100%">
                ${this.renderRows(data)}
              <table>
            `
                return html
            }
        },
        renderRows(data) {
            var html = ``
            for (var [key, value] of Object.entries(data)) {
                key = key.trim()
                if (key != "" && value != "") {
                    if (key == 'Image') {
                        html += `
                 <tr style="border: 1px solid black; width:100%">
                    <thstyle="border: 1px solid black">${key}</th>
                    <td><img :src="data:image/png;base64,${value}" style="height:20vh"></td>
                </tr>
              `
                    } else if (value != undefined || value != "") {
                        html += `
                <tr style="border: 1px solid black; width:100%">
                  <th style="border: 1px solid black;">${key}</th>
                  <td>${this.renderJSON(value)}</td>
                </tr>
              `
                    }
                }
            }
            return html
        },
        execute(deviceId, command) {
            const headers = {
                'Content-Type': 'application/json',
                'fiware-service': 'openiot',
                'fiware-servicepath': '/'
            }
            var data = {}
            data[command] = {
                "type": "command",
                "value": ""
            }
            axios.patch(`http://${this.fiwareIP}:${this.OCBPort}/v2/entities/${deviceId}/attrs`, data, {
                headers: headers
            }).then((response) = {})
        },

        executeRobot(robotId, command) {
            //console.log("execute robot ", command)
            var offsetTime = Math.round((Date.now() / 1000)) + 1000
            var data = JSON.stringify({
                "cmd": {
                    "metadata": {},
                    "value": `{%27firosstamp%27: ${offsetTime}, %27data%27: %27${command}%27}`,
                    "type": "std_msgs.msg.String"
                },
                "COMMAND": {
                    "type": "COMMAND",
                    "value": [
                        "cmd"
                    ]
                }
            });
            const headers = {
                'Content-Type': 'application/json'
            }
            url = `http://${this.fiwareIP}:${this.OCBPort}/v2/entities/${robotId}/attrs`

            axios.put(`http://${this.fiwareIP}:${this.OCBPort}/v2/entities/${robotId}/attrs`, data, {
                headers: headers
            }).then((response) = {})
        },

        hashCode(s) {
            if (s) {
                var h;
                for (var i = 0; i < s.length; i++) {
                    h = Math.imul(31, h) + s.charCodeAt(i) | 1;
                }
                return Math.abs(h);
            } else {
                return 0
            }
        },

        getRandomColor(type) {
            return this.colors[this.hashCode(type) % this.colors.length]
        },

        listenTopic() {
            //console.log("listen to: ", this.selectedTopic)
            this.devices = {}
            this.deviceLocationMap = {}
            this.collisionLocationMap = {}
            this.updateDevicePoints()
            this.updateCollisionPoints()
            axios
                .get(`http://${this.proxyIP}:${this.proxyPort}/api/register/${this.selectedTopic}`)
                .then(response => {
                    //console.log(response.data.socket)
                    this.remoteSocket.removeAllListeners(this.socketName)
                    this.socketName = response.data.socket
                    this.remoteSocket.on(this.socketName, data => {
                        this.handleRemoteSocketData(JSON.parse(data))
                    })
                })
        },

        handleRemoteSocketData(data) {
            switch (data.type) {
                case 'Analytics:Collision':
                    this.handleCollisionData(data)
                    break;
                default:
                    this.handleDeviceData(data)
                    break;
            }
        },

        handleDeviceData(data) {
            data = JSON.parse(JSON.stringify(data).replaceAll("%27", '"').replaceAll('"{', '{').replaceAll('}"', '}'))
            if (!Object.keys(this.devices).includes(data.id)) {
                // console.log(data.id, data)
                this.$set(this.devices, data.id, {
                    'id': data.id,
                    'data': data,
                    'color': this.getRandomColor(data.type)
                })
                //if is a robot -> gestione dedicata
                if (data.type == "ROBOT") {
                    //console.log(data)
                    this.deviceLocationMap[data.id] = [data.gnss.value.data.longitude, data.gnss.value.data.latitude, this.devices[data.id].color]
                } else {
                    if (data.Longitude && data.Latitude) {
                        this.deviceLocationMap[data.id] = [data.Longitude.value, data.Latitude.value, this.devices[data.id].color]
                    }
                }
            } else {
                this.devices[data.id].data = data
                // console.log("update", data.id, data)
                //if is a robot -> gestione dedicata
                if (data.type == "ROBOT") {
                    this.deviceLocationMap[data.id][0] = data.gnss.value.data.longitude
                    this.deviceLocationMap[data.id][1] = data.gnss.value.data.latitude
                } else if (data.Longitude && data.Latitude) {
                    this.deviceLocationMap[data.id][0] = data.Longitude.value
                    this.deviceLocationMap[data.id][1] = data.Latitude.value
                }
            }
            this.updateDevicePoints()
            //console.log(this.devices)
        },

        handleCollisionData(data) {
            //console.log(data)
            this.$set(this.collisions, data.id, data)
            this.collisionLocationMap[data.id] = [data.Device1_longitude.value, data.Device1_latitude.value]
            this.updateCollisionPoints()
        },

        updateDevicePoints() {
            this.devicePoints = []
            var i = 0
            for (const [key, value] of Object.entries(this.deviceLocationMap)) {
                this.devicePoints[i] = new ol.Feature({
                    geometry: new ol.geom.Point(new ol.proj.transform(
                        [
                            value[0],
                            value[1]
                        ], 'EPSG:4326', 'EPSG:3857'))
                })
                this.devicePoints[i].set('color', value[2])
                i++
            }
            this.deviceLayer.setSource(new ol.source.Vector({features: this.devicePoints}))
            this.deviceLayer.changed()
        },

        updateCollisionPoints() {
            this.collisionPoints = []
            var i = 0
            for (const [key, value] of Object.entries(this.collisionLocationMap)) {
                this.collisionPoints[i] = new ol.Feature({
                    geometry: new ol.geom.Point(new ol.proj.transform(
                        [
                            value[0],
                            value[1]
                        ], 'EPSG:4326', 'EPSG:3857'))
                })
                i++
            }
            this.collisionLayer.setSource(new ol.source.Vector({features: this.collisionPoints}))
            this.collisionLayer.changed()
        },

        loadMap() {
            this.deviceLayer = new ol.layer.Vector({
                features: this.devicePoints,
                style: function (feature, resolution) {
                    return new ol.style.Style({
                        image: new ol.style.Circle({
                            radius: 5,
                            stroke: new ol.style.Stroke({
                                color: '#fff'
                            }),
                            fill: new ol.style.Fill({
                                color: feature.get("color")
                            })
                        })
                    })
                }
            })

            this.collisionLayer = new ol.layer.Vector({
                features: this.collisionPoints,
                style: new ol.style.Style({
                    image: new ol.style.RegularShape({
                        fill: new ol.style.Fill({color: 'red'}),
                        stroke: new ol.style.Stroke({color: 'black', width: 2}),
                        points: 4,
                        radius: 10,
                        angle: Math.PI / 4
                    })
                })
            })

            this.worldImagery = new ol.layer.Tile({
                source: new ol.source.XYZ({
                    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                    maxZoom: 23
                }),
                visible: this.satelliteVisibility
            })

            this.map = new ol.Map({
                target: 'map',
                view: new ol.View({
                    center: ol.proj.fromLonLat([-3.4808443373094113, 40.31275148286198]),
                    zoom: 18
                }),
                layers: [
                    // Basemap
                    new ol.layer.Tile({
                        source: new ol.source.OSM()
                    }),
                    // satellite layer
                    this.worldImagery,
                    this.deviceLayer,
                    this.collisionLayer
                ]
            })
        },

        toggleSatellite() {
            this.worldImagery.setVisible(this.satelliteVisibility)
            this.worldImagery.changed()
        },

        loadTopics() {
            axios
                .get(`http://${this.webServerIP}:${this.webServerPort}/api/topic`)
                .then(response => {
                    //console.log(response)
                    this.topics = response.data.map(e => {
                        return {id: `${e.kind}: ${e.id}`, topic: `${e.topic}`}
                    })
                    this.topics.push({'id': 'collision', 'topic': 'data.collision'})
                    this.topics.push({'id': 'canary', 'topic': 'data.canary.realtime'})
                })
        },

        init() {
            this.remoteSocket = io.connect(`http://${this.proxyIP}:${this.proxyPort}`)
            this.localSocket = io.connect(`http://${this.webServerIP}:${this.webServerPort}`)
            this.loadMap()
            this.loadTopics()
            this.localSocket.on("updateTopic", data => {
                this.loadTopics()
            })
            this.listenTopic()
        }
    },
    mounted() {
        this.init()
    }
}
