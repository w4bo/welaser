const mapDashboard = {
    template: `
        <div>
            <v-row align="center" justify="center"><v-col cols=8><mymap></mymap></v-col></v-row>
            <v-row justify="center">
                <template v-for="device in Object.values(devices)">
                    <v-col cols=3 class="pa-3 d-flex flex-column">
                        <v-card class="elevation-5 ma-5 flex d-flex flex-column" :color="device.color">
                            <v-card-title class="pb-0">{{device.id}}</v-card-title>
                            <v-card-text class="flex"><div v-html="updateCards(device.data)"></div></v-card-text>
                            <v-card-actions>
                                <div v-if="typeof device.data.cmdList !== 'undefined'">
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
            devices: {},
            hideDetails: true,
        }
    },
    components: {
        mymap: mymap
    },
    methods: {
        updateCards(data) {
            return utils.renderJSON(data, this.hideDetails)
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
        handleStreamData(data) {
            if (this.devices[data.id]) { // if the device is known, update its data content
                this.devices[data.id].data = data
            } else { // else, create it
                // this.devices[data.id] = {'id': data.id, 'data': data, 'color': utils.getRandomColor(data.type)} this is not working on
                // $set allows us to add a new property to an already reactive object, and makes sure that this new property is ALSO reactive
                this.$set(this.devices, data.id, {'id': data.id, 'data': data, 'color': utils.getRandomColor(data.type)})
            }
        },
    },
    mounted() {
        const remoteSocket = io.connect(utils.proxyurl) // connect to the Kafka proxy server
        utils.kafkaProxyNewTopic(remoteSocket, utils.agrifarm, this.handleStreamData)
    }
}
