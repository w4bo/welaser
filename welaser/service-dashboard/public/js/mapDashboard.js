const mapDashboard = {
    template: `
      <div style="padding: 2%">
          <!-- <v-row justify="center" align="center">-->
          <!--   <div>-->
          <!--     <v-switch v-model="satelliteVisibility" label='Show Satellite' v-on:click="toggleSatellite"></v-switch>-->
          <!--   </div>-->
          <!-- </v-row>-->
          <v-row align="center" justify="center">
              <v-col cols=9><v-select :items="topics" item-text="id" item-value="topic" label="Topic" v-model="selectedTopic"></v-select></v-col>
              <v-col cols=1><v-btn v-on:click="listenTopic" elevation="2">Listen</v-btn></v-col>
          </v-row>
          <v-row align="center" justify="center"><v-col cols=10><div id="map" class="map" style="height: 400px"></div></v-col></v-row>
          <v-row align="center" justify="center"><v-switch v-model="hideDetails" label='Hide details'></v-switch></v-row>
          <v-row align="center" justify="center">
              <template v-for="device in Object.values(devices)">
                  <v-col cols=3 class="pa-3 d-flex flex-column">
                  <v-card class="elevation-5 ma-5 flex d-flex flex-column" :color="device.color">
                      <v-card-title class="pb-0">{{device.data.id}}</v-card-title>
                          <v-card-text class="flex"><div v-html="renderJSON(device.data)"></div></v-card-text>
                          <v-card-actions>
                              <!-- Commands from IoT Agent -->
                              <template v-for="(value, key) in device.data">
                                  <v-btn v-if="value.type=='commandResult'" v-on:click="sendCommand(device.id, key.split('_')[0])"> {{key.split("_")[0]}} </v-btn>
                              </template>
                              <!-- Commands from the AgriRobot -->
                              <div v-if="typeof device.data !== 'undefined' && typeof device.data.cmdList !== 'undefined'">
                                  <template v-for="cmd in device.data.cmdList.value">
                                      <v-btn v-on:click="sendCommand(device.id, cmd)"> {{cmd}} </v-btn>
                                  </template>
                              </div>
                          </v-card-actions>
                      </v-card-title>
                  </v-card>
                  </v-col>
              </template>
          </v-row>
      </div>`,
    data() {
        return {
            ORION_URL: `http://${config.ORION_IP}:${config.ORION_PORT_EXT}/v2/`,
            headers: {'Content-Type': 'application/json'},
            layerBoundary: null,
            layerStream: null,

            devices: {},
            collisions: {},
            remoteSocket: null,
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
            hideDetails: true,
            topics: ["data.canary.realtime"],
            selectedTopic: "data.canary.realtime",
            colors: d3.schemeTableau10
        }
    },
    methods: {
        renderJSON(data) {
            if (typeof (data) != "object") {
                if (typeof (data) == "string") { data = data.trim() }
                return data
            } else {
                return this.renderRows(data)
            }
        },
        renderRows(data) {
            let html = `<table style="border-collapse: collapse; width:100%; margin-left: auto; margin-right: auto">`
            for (let [key, value] of Object.entries(data)) {
                key = key.trim()
                if (typeof value == 'string') value = value.trim().replaceAll("%3D", "=")
                if (this.hideDetails && [
                        "id", "timestamp_iota", "timestamp_subscription", "domain", "mission", "location",
                        "actualLocation", "plannedLocation", "category", "cmdList", "weight", "heading",
                        "hasFarm", "hasDevice", "hitch", "refRobotModel", "areaServed"
                    ].includes(key)) {
                } else {
                    const base64regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
                    if (typeof value.value !== "undefined" || value.value === "") { value = value.value }
                    let th = `<th style="border: 1pt solid black">${key}</th>`
                    if (Array.isArray(data)) { th = "" }
                    html += `<tr style="border: 1pt solid black; width:100%">${th}<td>`
                    if (typeof value == 'string' && value.length > 100 && base64regex.test(value)) {
                        html += `<img src="data:image/png;base64,${value}" style="width:20vh" alt="Broken image: ${value}">`
                    } else if (key === 'timestamp') {
                        const date = new Date(parseInt(value));
                        // Hours part from the timestamp
                        const year = date.getFullYear();
                        // Minutes part from the timestamp
                        const month = "0" + date.getMonth();
                        // Seconds part from the timestamp
                        const day = "0" + date.getDay();
                        // Hours part from the timestamp
                        const hours = date.getHours();
                        // Minutes part from the timestamp
                        const minutes = "0" + date.getMinutes();
                        // Seconds part from the timestamp
                        const seconds = "0" + date.getSeconds();
                        const formattedTime = year + "-" + month.substr(-2) + "-" + day.substr(-2) + " " + hours + ':' + minutes.substr(-2) + ':' + seconds.substr(-2);
                        html += formattedTime
                    } else if (value !== "") {
                        html += this.renderJSON(value)
                    }
                    html += `</td></tr>`
                    html = html
                        .replaceAll("<table style=\"border-collapse: collapse; width:100%; margin-left: auto; margin-right: auto\"></table>", "")
                        .replaceAll("<td></td>", "")
                }
            }
            return html + `</table>`
        },
        sendCommand(deviceId, command) {
            const inner = {}
            inner[command] = {}
            axios
                .patch(
                    this.ORION_URL + `/entities/${deviceId}/attrs?options=keyValues`,
                    {"cmd": inner},
                    {headers: this.headers}
                )
                .then(response => { console.log(response) })
                .catch(err => { console.log(err) })
        },
        hashCode(s) {
            if (s) {
                let h;
                for (let i = 0; i < s.length; i++) { h = Math.imul(31, h) + s.charCodeAt(i) | 1; }
                return Math.abs(h);
            } else {
                return 0
            }
        },
        getRandomColor(type) {
            return this.colors[this.hashCode(type) % this.colors.length]
        },
        listenTopic() {
            this.devices = {}
            this.deviceLocationMap = {}
            this.collisionLocationMap = {}
            this.updateDevicePoints()
            this.updateCollisionPoints()
            this.remoteSocket.removeAllListeners(this.socketName) // remove the listeners to the old topic
            this.socketName = this.selectedTopic // update the topic name
            this.remoteSocket.emit("newtopic", this.selectedTopic) // notify the new topic on which the kafka proxy should create a Kakfa consumer
            this.remoteSocket.on(this.socketName, data => { console.log("Message"); this.handleRemoteSocketData(JSON.parse(data)) }) // listen to the new topic
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
            // data = JSON.parse(JSON.stringify(data).replaceAll("%27", '"').replaceAll('"{', '{').replaceAll('}"', '}'))
            // if (!Object.keys(this.devices).includes(data.id)) { // if the device is unkown
            //     this.$set(this.devices, data.id, {
            //         'id': data.id,
            //         'data': data,
            //         'color': this.getRandomColor(data.type)
            //     })
            // }
            // const device = this.devices[data.id]
            // device.data = data
            // this.updateDevicePoints()
        },
        handleCollisionData(data) {
            // this.$set(this.collisions, data.id, data)
            // this.collisionLocationMap[data.id] = [data.Device1_longitude.value, data.Device1_latitude.value]
            // this.updateCollisionPoints()
        },
        updateDevicePoints() {
            // this.devicePoints = []
            // let i = 0
            // for (const [key, value] of Object.entries(this.deviceLocationMap)) {
            //     this.devicePoints[i] = new ol.Feature({ geometry: new ol.geom.Point(new ol.proj.transform([value[0], value[1]], 'EPSG:4326', 'EPSG:3857')) })
            //     this.devicePoints[i].set('color', value[2])
            //     i++
            // }
            // this.deviceLayer.setSource(new ol.source.Vector({features: this.devicePoints}))
            // this.deviceLayer.changed()
        },
        updateCollisionPoints() {
            // this.collisionPoints = []
            // var i = 0
            // for (const [key, value] of Object.entries(this.collisionLocationMap)) {
            //     this.collisionPoints[i] = new ol.Feature({ geometry: new ol.geom.Point(new ol.proj.transform([value[0], value[1]], 'EPSG:4326', 'EPSG:3857')) })
            //     i++
            // }
            // this.collisionLayer.setSource(new ol.source.Vector({features: this.collisionPoints}))
            // this.collisionLayer.changed()
        },
        loadMap() {
            // this.administrativeBoundariesLayer = new ol.layer.Vector({ features: (new ol.format.GeoJSON()).readFeatures(this.administrativeBoundaries) })
            // this.deviceLayer = new ol.layer.Vector({
            //     features: this.devicePoints,
            //     style: function (feature, resolultion) {
            //         return new ol.style.Style({
            //             image: new ol.style.Circle({
            //                 radius: 5,
            //                 stroke: new ol.style.Stroke({ color: '#fff' }),
            //                 fill: new ol.style.Fill({ color: feature.get("color") })
            //             })
            //         })
            //     }
            // })
            // this.worldImagery = new ol.layer.Tile({ // Satellite layer
            //     source: new ol.source.XYZ({ url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', maxZoom: 23 }),
            //     visible: this.satelliteVisibility
            // })
            // this.map = new ol.Map({
            //     target: 'map',
            //     view: new ol.View({ center: ol.proj.fromLonLat([-3.482, 40.31255]), zoom: 18 }),
            //     layers: [
            //         new ol.layer.Tile({ source: new ol.source.OSM() }), // Basemap
            //         this.worldImagery, // Satellite layer
            //         this.deviceLayer,
            //         this.administrativeBoundariesLayer
            //     ]
            // })
            this.layerBoundary = L.layerGroup([]);
            const osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'});
            const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}');
            this.map = L.map('map', {center: [40.31255, -3.482], zoom: 18, layers: [satellite, this.layerBoundary]})
            const map = this.map
            const baseMaps = {
                "Satellite": satellite,
                "OpenStreetMap": osm,
            };
            const overlayMaps = {
                "Boundaries": this.layerBoundary
            };
            const layerControl = L.control.layers(baseMaps, overlayMaps).addTo(map);
            //
        },
        toggleSatellite() {
            this.worldImagery.setVisible(this.satelliteVisibility)
            this.worldImagery.changed()
        },
        init() {
            this.remoteSocket = io.connect(`http://${this.PROXY_IP}:${this.PROXY_PORT_EXT}`)
            const ORION_URL = this.ORION_URL
            this.loadMap()
            const layerBoundary = this.layerBoundary
            const map = this.map
            axios // get the agrifarms
                .get(ORION_URL + `entities?type=AgriFarm&options=keyValues&limit=1000`)
                .then(agrifarms => {
                    agrifarms.data.forEach(function (agrifarm, index) { // for each agrifarm...
                        const attrs = ["hasAgriParcel", "hasRestrictedTrafficArea", "hasRoadSegment"] // "hasBuilding",
                        attrs.forEach(function (attr, index) {
                            agrifarm[attr].forEach(function (id, index) {
                                axios
                                    .get(ORION_URL + `entities/${id}?options=keyValues&attrs=location`)
                                    .then(loc => {
                                        let color = "#ff7800"
                                        const type = loc.data.type
                                        if (type === "AgriParcel") {
                                            color = d3.schemeCategory10[2]
                                        } else if (type === "RestrictedTrafficArea") {
                                            color = d3.schemeCategory10[3]
                                        } else if (type === "RoadSegment") {
                                            color = d3.schemeCategory10[0]
                                        } else if (type === "Building") {
                                            color = d3.schemeCategory10[0]
                                        }
                                        const myStyle = {"color": color, "weight": 5, "opacity": 0.65};
                                        const geojson =
                                            {
                                                "type": "Feature",
                                                "properties": {},
                                                "geometry": {
                                                    "type": loc.data.location.type,
                                                    "coordinates": loc.data.location.coordinates
                                                }
                                            }
                                        L.geoJSON(geojson, {style: myStyle}).bindPopup(loc.data.id).addTo(layerBoundary);
                                    })
                            })
                        })
                    })
                    // this.administrativeBoundariesLayer.setSource(new ol.source.Vector({features: administrativeBoundaries}))
                    // this.administrativeBoundariesLayer.changed()
                })

            this.listenTopic()
        }
    },
    mounted() {
        this.init()
    }
}
