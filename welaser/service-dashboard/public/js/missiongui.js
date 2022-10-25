const missiongui = {
    template: `
        <div>
            <v-row align="center" justify="center">
                <v-col cols=8><mymap></mymap></v-col>
                <v-col cols=4>
                    <template v-for="device in Object.values(robots)">
                        <v-card v-if="isSelected(device.data)" :color="device.color">
                            <v-card-title class="p-0">{{device.data.name}}</v-card-title>
                            <v-card-text class="p-0">
                                <table style="width: 100%">
                                    <tr><td>Speed</td><td>{{device.data.speed}}</td></tr>
                                    <tr><td>Bearing</td><td>{{device.data.bearing}}</td></tr>
                                    <tr v-if="is('choosemission')">
                                        <td><v-btn v-on:click="missionChosen()" class="m-1">Choose mission</v-btn></td>
                                        <td><v-select :items="missions" item-value="id" item-text="name" v-model="mission" style="padding: 0" dense></v-select></td>
                                    </tr>
                                    <template v-for="cmd in device.data.cmdList">
                                        <tr v-if="is(cmd)"><td colspan="2"><v-btn v-on:click="sendCommand(device.data.id, cmd)" class="m-1" style="width: 98%"> {{cmd}} </v-btn></td></tr>
                                    </template>
                                </table> 
                            </v-card-text>
                        </v-card>
                    </template>
                </v-col>
            </v-row>
<!--            <v-row justify="center">-->
<!--                <template v-for="device in Object.values(devices)">-->
<!--                    <v-col cols=3 v-if="isSelected(device.data)">-->
<!--                        <v-card :color="device.color">-->
<!--                            <v-card-title class="p-0">{{getName(device.data)}}</v-card-title>-->
<!--                            <v-card-text class="p-0">-->
<!--                                <iframe :src="device.data.streamURL" width="100%" allow='autoplay'></iframe>-->
<!--                            </v-card-text>-->
<!--                        </v-card>-->
<!--                    </v-col>-->
<!--                </template>-->
<!--            </v-row>-->
        </div>`,
    data() {
        return {
            devices: {},
            robots: {},
            choosemission: true,
            executemission: false,
            stop: false,
            pause: false,
            resume: false,
            mission: "",
            missions: []
        }
    },
    components: {
        mymap: mymap,
        entitymenu: entitymenu
    },
    methods: {
        sendCommand(id, cmd) {
            let payload = {}
            if (cmd === "executemission") {
                this.missionStarted()
                payload["missionid"] = this.mission
            } else if (cmd === "stop") {
                this.choosemission = true
                this.executemission = false
                this.stop = false
                this.pause = false
                this.resume = false
            } else if (cmd === "pause") {
                this.choosemission = false
                this.executemission = false
                this.stop = true
                this.pause = false
                this.resume = true
            } else if (cmd === "resume") {
                this.missionStarted()
            }
            return utils.sendCommand(id, cmd, payload)
        },
        missionChosen() {
            this.choosemission = false
            this.executemission = true
            this.stop = false
            this.pause = false
            this.resume = false
        },
        missionStarted() {
            this.choosemission = false
            this.executemission = false
            this.stop = true
            this.pause = true
            this.resume = false
        },
        is(str) {
            return this[str]
        },
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
        const tis = this
        utils.getDevices(this, "Camera", this.devices)
        utils.getDevices(this, "AgriRobot", this.robots)
        utils.getDevices(this, 'Task', {}, function(acc) {
            Object.values(acc).forEach(function(task) {
                task = task.data
                if (task["taskType"] === "Mission")  { // TODO choose the mission from the current robot task["hasAgriRobot"] === "foo"
                    tis.missions.push({name: utils.getName(task), id: task["id"]})
                }
            })
            tis.mission = tis.missions[0].id
        })
        const remoteSocket = io.connect(utils.proxyurl) // connect to the Kafka proxy server
        utils.kafkaProxyNewTopic(remoteSocket, utils.agrifarm, this.handleStreamData)
    }
}
