const mapDashboard = {
    template: `
      <div style="padding: 1%">
          <!--<v-row align="center" justify="center">-->
          <!--    <v-col cols=8><v-select :items="topics" item-text="name" item-value="id" v-model="selectedTopic" style="z-index: 20"></v-select></v-col>-->
          <!--    <v-col cols=1><v-btn v-on:click="listenTopic" elevation="2">Listen</v-btn></v-col>-->
          <!--    <v-col cols=1><v-switch v-model="hideDetails" label='Hide details'></v-switch></v-col>-->
          <!--    &lt;!&ndash; <v-row align="center" justify="center"><v-switch v-model="hideDetails" label='Hide details'></v-switch></v-row>&ndash;&gt;-->
          <!--</v-row>-->
          <v-row align="center" justify="center"><v-col cols=8><div id="map" class="map" style="height: 250px"></div></v-col></v-row>
          <v-row justify="center">
              <template v-for="device in Object.values(devices)">
                  <v-col cols=3 class="pa-3 d-flex flex-column">
                  <v-card class="elevation-5 ma-5 flex d-flex flex-column" :color="device.color">
                      <v-card-title class="pb-0">{{device.data.id}}</v-card-title>
                      <v-card-text class="flex"><div v-html="vueRenderJSON(device.data)"></div></v-card-text>
                      <v-card-actions>
                          <div v-if="typeof device.data !== 'undefined' && typeof device.data.cmdList !== 'undefined'">
                              <template v-for="cmd in device.data.cmdList">
                                  <v-btn v-on:click="sendCommand(device.id, cmd)"> {{cmd}} </v-btn>
                              </template>
                          </div>
                      </v-card-actions>
                  </v-card>
                  </v-col>
              </template>
          </v-row>
      </div>`,
    data() {
        return {
            layerBoundary: null,
            layerStream: null,
            layerControl: null,
            map: null,
            devices: {},
            devicesLocation: {},
            remoteSocket: null,
            socketName: "",
            hideDetails: true,
            topics: [],
            selectedTopic: "",
            colors: d3.schemeTableau10
        }
    },
    methods: {
        vueRenderJSON(data) {
            return utils.renderJSON(data, this.hideDetails, false)
        },
        sendCommand(deviceId, command) {
            const inner = {}
            inner[command] = {}
            axios
                .patch(
                    utils.orionurl + `entities/${deviceId}/attrs?options=keyValues`,
                    {"cmd": inner},
                    {headers: utils.jsonheaders}
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
            if (this.selectedTopic && this.selectedTopic !== "") {
                this.devices = {}
                this.devicesLocation = {}
                this.remoteSocket.removeAllListeners(this.socketName) // remove the listeners to the old topic
                const selectedTopic = config.DRACO_RAW_TOPIC + "." + this.selectedTopic.replaceAll(/[-:_]/g, "")
                this.socketName = selectedTopic // update the topic name
                this.remoteSocket.emit("newtopic", selectedTopic) // notify the new topic on which the kafka proxy should create a Kakfa consumer
                this.remoteSocket.on(this.socketName, data => { this.handleRemoteSocketData(JSON.parse(data)) }) // listen to the new topic
                this.updateAgriFarm(false)
            }
        },
        handleRemoteSocketData(data) {
            console.log("Message")
            switch (data.type) {
                default:
                    this.handleStreamData(data)
                    break;
            }
        },
        handleStreamData(data) {
            const hasLocation = Object.keys(data).includes("location")
            if (!Object.keys(this.devices).includes(data.id)) { // if the device is unknown
                this.$set(this.devices, data.id, { 'id': data.id, 'data': data, 'color': this.getRandomColor(data.type) })
                if (hasLocation) {
                    const coordinates = data.location.coordinates
                    this.$set(this.devicesLocation, data.id, L.circle(L.latLng(coordinates[1], coordinates[0]), 3, {"color": this.getRandomColor(data.type)}).bindPopup(data.id).addTo(this.layerStream))
                }
            }
            const device = this.devices[data.id]
            device.data = data
            if (hasLocation) {
                const coordinates = data.location.coordinates
                this.devicesLocation[data.id].setLatLng(L.latLng(coordinates[1], coordinates[0])) // .update()
            }
        },
        loadMap() {
            // creating the layers
            this.layerBoundary = L.layerGroup([]) // empty layer
            this.layerStream = L.layerGroup([]) // empty layer
            const osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'})
            const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}')
            // creating the map
            this.map = L.map('map', {center: [40.3128, -3.482], zoom: 17, layers: [satellite, this.layerBoundary, this.layerStream]})
            // add the layers to the group
            const baseMaps = { "Satellite": satellite,  "OpenStreetMap": osm }
            const overlayMaps = { "Boundaries": this.layerBoundary, "Stream": this.layerStream }
            this.layerControl = L.control.layers(baseMaps, overlayMaps).addTo(this.map)
        },
        loadAgriFarms() {
            const tis = this
            axios // get the agrifarms
                .get(utils.orionurl + `entities?type=AgriFarm&options=keyValues&limit=1000`)
                .then(agrifarms => {
                    agrifarms.data.forEach(function (agrifarm, index) { // for each agrifarm...
                        if (agrifarm.id === utils.agrifarm) {
                            tis.topics.push({"name": agrifarm.name, "id": agrifarm.id})
                            tis.selectedTopic = agrifarm.id
                        }
                    })
                    tis.updateAgriFarm()
                })
        },
        updateAgriFarm(listenTopic=true) {
            const tis = this
            this.map.removeLayer(this.layerBoundary) // remove the layer, do not plot it twice
            this.map.removeLayer(this.layerStream) // remove the layer, do not plot it twice
            this.layerControl.removeLayer(this.layerBoundary) // clean the existing layers
            this.layerControl.removeLayer(this.layerStream) // clean the existing layers
            this.layerBoundary = L.layerGroup([]) // add the layer to the layer group
            this.layerStream = L.layerGroup([]) // add the layer to the layer group
            this.layerControl.addOverlay(this.layerBoundary, "Boundaries")  // add the new layer
            this.layerControl.addOverlay(this.layerStream, "Stream")  // add the new layer
            this.layerBoundary.addTo(this.map) // make the layer visible
            this.layerStream.addTo(this.map) // make the layer visible
            axios // get the selected agrifarm
                .get(utils.orionurl + `entities/${tis.selectedTopic}?options=keyValues`)
                .then(agrifarm => {
                    agrifarm = agrifarm.data
                    const attrs = ["hasAgriParcel", "hasRestrictedTrafficArea", "hasBuilding", "hasRoadSegment"]
                    attrs.forEach(function (attr, index) {
                        if (agrifarm[attr]) {
                            agrifarm[attr].forEach(function (id, index) {
                                axios
                                    .get(utils.orionurl + `entities/${id}?options=keyValues&attrs=location`)
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
                                        const geojson = {
                                            "type": "Feature",
                                            "properties": {},
                                            "geometry": { "type": loc.data.location.type,  "coordinates": loc.data.location.coordinates }
                                        }
                                        L.geoJSON(geojson, {style: myStyle}).bindPopup(loc.data.id).addTo(tis.layerBoundary)
                                    })
                            })
                        }
                    })
                    if (listenTopic) tis.listenTopic()
                })
        },
        init() {
            this.remoteSocket = io.connect(`http://${this.PROXY_IP}:${this.PROXY_PORT_EXT}`)
            this.loadMap() // create the map
            this.loadAgriFarms() // populate the map with the selected agrifarm
        }
    },
    mounted() {
        this.init()
    }
}
