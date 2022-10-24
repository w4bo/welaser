const missiongui = {
    template: `
        <div>
            <v-row align="center" justify="center">
                <v-col cols=1><entitymenu></entitymenu></v-col>
                <v-col cols=8><mymap></mymap></v-col>
                <v-col cols=2>
                    <template v-for="device in Object.values(robots)">
                        <v-card v-if="isSelected(device)" :color="device.color">
                            <v-card-title class="p-0">{{device.name}}</v-card-title>
                            <v-card-text class="p-0">
                                <table>
                                    <tr><td>Speed</td><td>{{device.speed}}</td></tr>
                                    <tr><td>Bearing</td><td>{{device.bearing}}</td></tr>
                                    <template v-for="cmd in device.cmdList">
                                        <tr><td colspan="2"><v-btn v-on:click="sendCommand(device.id, cmd)"> {{cmd}} </v-btn></td></tr>
                                    </template>
                                </table> 
                            </v-card-text>
                        </v-card>
                    </template>
                </v-col>
            </v-row>
            <v-row justify="center">
                <template v-for="device in Object.values(devices)">
                    <v-col cols=3 v-if="isSelected(device)">
                        <v-card :color="device.color">
                            <v-card-title class="p-0">{{device.cameraName}}</v-card-title>
                            <v-card-text class="p-0">
                                <iframe v-bind:src="device.streamURL" width="100%" allow='autoplay'></iframe>
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
        isSelected(device) {
            const selectedDevices = utils.selectedbytype[device.type]
            const name = utils.getName(device)
            return name === selectedDevices || (Array.isArray(selectedDevices) && selectedDevices.includes(name))
        }
    },
    mounted() {
        utils.getDevices(this, "Camera", this.devices)
        utils.getDevices(this, "AgriRobot", this.robots)
    }
}
