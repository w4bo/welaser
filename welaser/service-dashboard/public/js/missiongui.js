const missiongui = {
    template: `
        <div>
            <v-row align="center" justify="center">
                <v-col cols=7><mymap topicroot="raw"/></v-col>
                <v-col cols=5>
                    <template v-for="device in Object.values(robots)">
                        <v-card v-if="isSelected(device.data)" :color="device.color">
                            <v-card-title class="p-0">{{device.data.name}}</v-card-title>
                            <v-card-text class="p-1">
                                <table style="width: 100%">
                                    <tr>
                                        <td><p><v-btn :color="!toggled(device.data.status[device.data.serviceProvided.indexOf('weeding')])? 'error' : 'success'" small><v-icon dark>{{ !toggled(device.data.status[device.data.serviceProvided.indexOf('weeding')])? 'mdi-minus-circle' : 'mdi-checkbox-marked-circle'}}</v-icon>Weeding</v-btn></p></td>
                                        <td><p><v-btn :color="!toggled(device.data.status[device.data.serviceProvided.indexOf('engine')])? 'error' : 'success'" small><v-icon dark>{{ !toggled(device.data.status[device.data.serviceProvided.indexOf('engine')])? 'mdi-minus-circle' : 'mdi-checkbox-marked-circle'}}</v-icon>Engine</v-btn></p></td>
                                    </tr>
                                    <tr>
                                        <td><p><v-btn :color="!toggled(device.data.status[device.data.serviceProvided.indexOf('armed')])? 'error' : 'success'" small><v-icon dark> {{ !toggled(device.data.status[device.data.serviceProvided.indexOf('armed')])? 'mdi-minus-circle' : 'mdi-checkbox-marked-circle'}}</v-icon>Armed</v-btn></p></td>
                                        <td><p><v-btn :color="!toggled(device.data.status[device.data.serviceProvided.indexOf('automotion')])? 'error' : 'success'" small><v-icon dark> {{ !toggled(device.data.status[device.data.serviceProvided.indexOf('automotion')])? 'mdi-minus-circle' : 'mdi-checkbox-marked-circle'}}</v-icon>Automotion</v-btn></p></td>
                                    </tr>
                                    <tr>
                                        <td><p><v-btn :color="!toggled(device.data.status[device.data.serviceProvided.indexOf('rtk')])? 'error' : 'success'" small><v-icon dark>{{ !toggled(device.data.status[device.data.serviceProvided.indexOf('rtk')])? 'mdi-minus-circle' : 'mdi-checkbox-marked-circle'}}</v-icon>RTK</v-btn></p></td>
                                    </tr>
                                    <tr><td>Battery</td><td><v-progress-linear v-model="device.data.status[device.data.serviceProvided.indexOf('battery')]" color="blue-grey" height="25">{{ device.data.status[device.data.serviceProvided.indexOf('battery')] }}</v-progress-linear></td></tr>
                                    <tr><td>Fuel</td><td><v-progress-linear v-model="device.data.status[device.data.serviceProvided.indexOf('fuel')]" color="blue-grey" height="25">{{ device.data.status[device.data.serviceProvided.indexOf('fuel')] }}</v-progress-linear></td></tr>
                                    <tr><td>State</td><td>{{ device.data.status[device.data.serviceProvided.indexOf('state')]}}</td></tr>
                                    <tr><td>Emergency</td><td>{{ device.data.status[device.data.serviceProvided.indexOf('emergency')]}}</td></tr>
                                    <!-- <tr><td>Speed</td><td>{{device.data.speed}}</td></tr>-->
                                    <!-- <tr><td>Bearing</td><td>{{device.data.bearing}}</td></tr>-->
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
            <v-row justify="center">
                <v-col cols=2>
                    <v-card elevation="3">
                        <v-card-title class="p-0">Events</v-card-title>
                        <template v-for="robot in Object.values(robots)">
                            <v-list-item v-if="robot.data.errors" v-for="error in robot.data.errors" style="background-color: #ff3300" class="p-1">
                                <v-list-item-content>{{error}}</v-list-item-content>
                            </v-list-item>
                            <v-list-item v-if="robot.data.warnings" v-for="warning in robot.data.warnings" style="background-color: #ff9966" class="p-1">
                                <v-list-item-content>{{warning}}</v-list-item-content>
                            </v-list-item>
                        </template>
                    </v-card>
                </v-col>
                <template v-for="device in Object.values(devices)">
                    <v-col cols=3 v-if="isSelected(device.data)">
                        <v-card :color="device.color" elevation="2">
                            <v-card-title class="p-0">{{getName(device.data)}}</v-card-title>
                            <v-card-text class="p-0">
                                <iframe v-if="device.data.streamURL" :src="device.data.streamURL" width="100%"></iframe>
                                <img v-if="(typeof device.data.streamURL === 'undefined' || device.data.streamURL === '') && device.data.imageSnapshot" :src="device.data.imageSnapshot" width="100%" />
                                Update: {{ formatDateTime(device.data.timestamp) }}
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
            choosemission: true,
            execute_mission: false,
            abort: false,
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
        toggled(v) {
            return v === 'on' || v === true || v === 'true'
        },
        formatDateTime(value) {
            return utils.formatDateTime(value, false)
        },
        sendCommand(id, cmd) {
            let payload = {}
            if (cmd === "execute_mission") {
                this.missionStarted()
                payload = {"missionid": this.mission}
            } else if (cmd === "abort") {
                this.choosemission = true
                this.execute_mission = false
                this.abort = false
                this.pause = false
                this.resume = false
            } else if (cmd === "pause") {
                this.choosemission = false
                this.execute_mission = false
                this.abort = true
                this.pause = false
                this.resume = true
            } else if (cmd === "resume") {
                this.missionStarted()
            }
            return utils.sendCommand(id, cmd, payload)
        },
        missionChosen() {
            this.choosemission = false
            this.execute_mission = true
            this.abort = false
            this.pause = false
            this.resume = false
        },
        missionStarted() {
            this.choosemission = false
            this.execute_mission = false
            this.abort = true
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
            let list = this.devices
            if (data.type === "AgriRobot") {
                list = this.robots
            }
            if (list[data.id]) { // if the device is known, update its data content
                list[data.id]["data"] = data
            } else { // else, create it
                this.$set(list, data.id, {'data': data, 'color': utils.getRandomColor(data.type)})
            }
        },
    },
    mounted() {
        const tis = this
        utils.getDevices(this, "Camera", this.devices)
        utils.getDevices(this, "AgriRobot", this.robots)
        utils.getDevices(this, "Task", {}, function(acc) {
            Object.values(acc).forEach(function(task) {
                task = task.data
                if (task["taskType"] === "Mission")  { // TODO choose the mission from the current robot task["hasAgriRobot"] === "foo"
                    tis.missions.push({name: utils.getName(task), id: task["id"]})
                }
            })
            tis.mission = tis.missions[0].id
        })
        const remoteSocket = io.connect(utils.proxyurl) // connect to the Kafka proxy server
        utils.kafkaProxyNewTopic(remoteSocket, config.DRACO_RAW_TOPIC + "." + utils.agrifarm, this.handleStreamData)
    }
}