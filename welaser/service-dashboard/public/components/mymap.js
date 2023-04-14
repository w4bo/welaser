const mymap = {
    template: `<div id="map" class="map" style="height: 250px; z-index: 1"></div>`,
    data() {
        return {
            layerBoundary: null,
            layerStream: null,
            // layerHeatmap: null,
            layerControl: null,
            map: null,
            devicesLocation: {},
        }
    },
    props: {
        topicroot: String
    },
    methods: {
        handleStreamData(data) {
            if (data["location"] && data["location"]["type"] === "Point") {
                const coordinates = data.location.coordinates
                if (this.devicesLocation[data.id]) { // if the device is known, update its location
                    this.devicesLocation[data.id].setLatLng(L.latLng(coordinates[1], coordinates[0]))
                } else { // else, create the circle
                    this.devicesLocation[data.id] = L.circle(
                        L.latLng(coordinates[1], coordinates[0]), // position
                        3, // radius
                        {"color": utils.getRandomColor(data.type)} // color
                    ).bindPopup(data.id).addTo(this.layerStream)
                }
            }
        },
        loadMap() {
            // creating the layers
            this.layerBoundary = L.layerGroup([]) // empty layer
            this.layerStream = L.layerGroup([]) // empty layer
            // this.layerHeatmap = L.layerGroup([]) // empty layer
            const osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'})
            const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}')
            // creating the map
            this.map = L.map('map', {layers: [satellite, this.layerBoundary, this.layerStream]})
            // add the layers to the group
            const baseMaps = { "Satellite": satellite,  "OpenStreetMap": osm }
            const overlayMaps = { "Boundaries": this.layerBoundary, "Stream": this.layerStream } // , "Weeding Heatmap": this.layerHeatmap
            this.layerControl = L.control.layers(baseMaps, overlayMaps).addTo(this.map)
        },
        updateAgriFarm() {
            const tis = this
            this.map.removeLayer(this.layerBoundary) // remove the layer, do not plot it twice
            this.map.removeLayer(this.layerStream) // remove the layer, do not plot it twice
            // this.map.removeLayer(this.layerHeatmap) // remove the layer, do not plot it twice
            this.layerControl.removeLayer(this.layerBoundary) // clean the existing layers
            this.layerControl.removeLayer(this.layerStream) // clean the existing layers
            // this.layerControl.removeLayer(this.layerHeatmap) // clean the existing layers
            this.layerBoundary = L.layerGroup([]) // add the layer to the layer group
            this.layerStream = L.layerGroup([]) // add the layer to the layer group


            // const cfg = {
            //    // radius should be small ONLY if scaleRadius is true (or small radius is intended)
            //    // if scaleRadius is false it will be the constant radius used in pixels
            //    "radius": 20,
            //    "maxOpacity": .8,
            //    // scales the radius based on map zoom
            //    // "scaleRadius": true,
            //    // if set to false the heatmap uses the global maximum for colorization
            //    // if activated: uses the data maximum within the current map boundaries
            //    //   (there will always be a red spot with useLocalExtremas true)
            //    // "useLocalExtrema": true,
            //    // which field name in your data represents the latitude - default "lat"
            //    latField: 'lat',
            //    // which field name in your data represents the longitude - default "lng"
            //    lngField: 'lng',
            //    // which field name in your data represents the data value - default "value"
            //    valueField: 'count'
            // }
            // this.layerHeatmap = new HeatmapOverlay(cfg);
            this.layerControl.addOverlay(this.layerBoundary, "Boundaries")  // add the new layer
            this.layerControl.addOverlay(this.layerStream, "Stream")  // add the new layer
            // this.layerControl.addOverlay(this.layerHeatmap, "Weeding Heatmap")  // add the new layer
            this.layerBoundary.addTo(this.map) // make the layer visible
            this.layerStream.addTo(this.map) // make the layer visible
            // this.layerHeatmap.addTo(this.map) // make the layer visible
            
            // Get laser data to fill the heatmap
            // const testData = {
            //     max: 300,
            //     data: []
            // }
            // axios.get(utils.nodeurl + `/api/entities/${utils.agrifarm}/urn:ngsi-ld:Device:Laser-123`).then(entities => {
            //     const allentities = entities.data
            //     allentities.forEach(entities => testData.data.push({"lat": entities.location.coordinates[1], "lng": entities.location.coordinates[0], "count": entities.value[0]}))
            //     this.layerHeatmap.setData(testData);
            // })

            axios // get the selected agrifarm
                .get(utils.orionurl + `entities/${utils.agrifarm}?options=keyValues`)
                .then(agrifarm => {
                    agrifarm = agrifarm.data
                    const farmLoc = agrifarm.landLocation
                    tis.map.setView(
                        new L.LatLng(farmLoc.coordinates[1], farmLoc.coordinates[0]), // map center
                        (farmLoc.properties && farmLoc.properties.zoom) ? farmLoc.properties.zoom : 17 // zoom level
                    )
                    // To show the geometry of the farm
                    // const geojson = {
                    //     "type": "Feature",
                    //     "geometry": { "type": agrifarm.location.type,  "coordinates": agrifarm.location.coordinates }
                    // }
                    // L.geoJSON(geojson).bindPopup(agrifarm.name).addTo(tis.layerBoundary)
                    const attrs = ["hasAgriParcel", "hasRestrictedTrafficArea", "hasBuilding", "hasRoadSegment"]
                    attrs.forEach(function (attr, index) {
                        if (agrifarm[attr]) {
                            agrifarm[attr].forEach(function (id, index) {
                                axios
                                    .get(utils.orionurl + `entities/${id}?options=keyValues&attrs=location,name`)
                                    .then(loc => {
                                        let color = utils.colors[9]
                                        const type = loc.data.type
                                        if (type === "AgriParcel") {
                                            color = utils.colors[4]
                                        } else if (type === "RestrictedTrafficArea") {
                                            color = utils.colors[2]
                                        } else if (type === "RoadSegment") {
                                            color = utils.colors[3]
                                        } else if (type === "Building") {
                                            color = utils.colors[0]
                                        }
                                        const myStyle = {"color": color, "weight": 5, "opacity": 1}
                                        const geojson = {
                                            "type": "Feature",
                                            "properties": {},
                                            "geometry": { "type": loc.data.location.type,  "coordinates": loc.data.location.coordinates }
                                        }
                                        L.geoJSON(geojson, {style: myStyle}).bindPopup(loc.data.name).addTo(tis.layerBoundary)
                                    })
                            })
                        }
                    })
                })
        },
    },
    mounted() {
        this.loadMap() // create the map
        this.updateAgriFarm()
        const remoteSocket = io.connect(utils.proxyurl) // connect to the Kafka proxy server
        utils.kafkaProxyNewTopic(remoteSocket, this.topicroot + "." + utils.agrifarm, this.handleStreamData)
    }
}
