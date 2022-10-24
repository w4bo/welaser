const missiongui = {
    template: `
        <div>
            <v-row align="center" justify="center">
                <v-col cols=2><entitymenu></entitymenu></v-col>
                <v-col cols=6><mymap></mymap></v-col>
                <v-col cols=3>
                    <template v-for="device in Object.values(robots)">
                        <v-card v-if="isSelected(device.data)" :color="device.color">
                            <v-card-title class="p-0">{{device.data.name}}</v-card-title>
                            <v-card-text class="p-0">
                                <table>
                                    <tr><td>Speed</td><td>{{device.data.speed}}</td></tr>
                                    <tr><td>Bearing</td><td>{{device.data.bearing}}</td></tr>
                                    <template v-for="cmd in device.data.cmdList">
                                        <tr><td colspan="2"><v-btn v-on:click="sendCommand(device.data.id, cmd)"> {{cmd}} </v-btn></td></tr>
                                    </template>
                                </table> 
                            </v-card-text>
                        </v-card>
                    </template>
                </v-col>
            </v-row>
            <v-row justify="center">
                <template v-for="device in Object.values(devices)">
                    <v-col cols=2 v-if="isSelected(device.data)">
                        <v-card :color="device.color">
                            <v-card-title class="p-0">{{getName(device.data)}}</v-card-title>
                            <v-card-text class="p-0">
                                <iframe v-bind:src="device.data.streamURL" width="100%" allow='autoplay'></iframe>
                            </v-card-text>
                        </v-card>
                    </v-col>
                </template>
            </v-row>
        </div>`,
    data() {
        return {
            devices: {},
            robots: {},
        }
    },
    components: {
        mymap: mymap,
        entitymenu: entitymenu
    },
    methods: {
        getName(device) {
            return utils.getName(device)
        },
        isSelected(device) {
            const selectedDevices = utils.selectedbytype[device.type]
            const name = utils.getName(device)
            return name === selectedDevices || (Array.isArray(selectedDevices) && selectedDevices.includes(name))
        },
        handleStreamData(data) {
            if (this.robots[data.id]) { // if the device is known, update its data content
                this.robots[data.id]["data"] = data
            } else { // else, create it
                this.$set(this.robots, data.id, {'data': data, 'color': utils.getRandomColor(data.type)})
            }
        },
    },
    mounted() {
        utils.getDevices(this, "Camera", this.devices)
        utils.getDevices(this, "AgriRobot", this.robots)
        const remoteSocket = io.connect(utils.proxyurl) // connect to the Kafka proxy server
        utils.kafkaProxyNewTopic(remoteSocket, utils.agrifarm, this.handleStreamData)
    }
}
