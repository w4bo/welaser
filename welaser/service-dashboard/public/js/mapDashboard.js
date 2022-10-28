const mapDashboard = {
    template: `
        <div>
            <v-row align="center" justify="center">
                <div>
                    Mode:
                    <input type="radio" id="r2" value="false" v-model="replaymode" class="ml-3 mr-1" @input="listenTopic(agrifarm)"/><label for="r2">Real time</label>
                    <input type="radio" id="r1" value="true" v-model="replaymode" class="ml-3 mr-1"/><label for="r1">Replay</label>
                </div>
            </v-row>
            <v-row justify="center">
                <div>
                    <v-btn v-on:click="listenTopic(mission.id)" class="m-1" style="float: left" :disabled="replaymode === 'false'">Listen mission</v-btn>
                    <v-select :items="missions" item-text="id" item-value="name" v-model="mission" dense :disabled="replaymode === 'false'"></v-select>
                </div>
            </v-row>
            <v-row align="center" justify="center"><v-col cols=8><mymap></mymap></v-col></v-row>
            <v-row align="center" justify="center">
                <v-switch v-model="hideDetails" label="Hide details" hide-details></v-switch>
            </v-row>
            <v-row justify="center">
                <template v-for="device in Object.values(devices)">
                    <v-col cols=3>
                        <v-card :color="device.color">
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
            replaymode: 'false',
            remoteSocket: io.connect(utils.proxyurl),
            missions: [],
            mission: {},
            agrifarm: utils.agrifarm,
            prevTopic: ""
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
            return utils.sendCommand(deviceId, command)
        },
        handleStreamData(data) {
            if (this.devices[data.id]) { // if the device is known, update its data content
                this.devices[data.id].data = data
            } else { // else, create it
                // $set allows us to add a new property to an already reactive object, and makes sure that this new property is ALSO reactive
                this.$set(this.devices, data.id, {'id': data.id, 'data': data, 'color': utils.getRandomColor(data.type)})
            }
        },
        listenTopic(topic) {
            if (topic !== this.prevTopic) {
                utils.kafkaProxyNewTopic(this.remoteSocket, topic, this.handleStreamData, undefined, this.replaymode)
                this.prevTopic = topic
            }
        }
    },
    mounted() {
        this.listenTopic(utils.agrifarm)
        const tis = this
        utils.getDevices(this, "Task", {}, function(acc) {
            Object.values(acc).forEach(function(task) {
                task = task.data
                tis.missions.push({name: utils.getName(task), id: task["id"]})
            })
            tis.mission = tis.missions[0]
        })
    }
}
