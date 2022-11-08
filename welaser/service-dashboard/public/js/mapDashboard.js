const mapDashboard = {
    template: `
        <div>
            <v-row align="center" justify="center">
                <div>
                    <input type="radio" id="r2" value="false" v-model="replaymode" class="ml-3 mr-1" @input="listenTopic(agrifarm)"/><label for="r2">Real time</label>
                    <input type="radio" id="r1" value="true" v-model="replaymode" class="ml-3 mr-1"/><label for="r1">Replay</label>
                </div>
            </v-row>
            <v-row align="center" justify="center" v-if="replaymode === 'true'">
                <v-col cols="1">
                    Mode
                    <div><input type="radio" id="r3" value="mission" v-model="replaymode2" class="ml-3 mr-1"/><label for="r3">Mission</label></div>
                    <div><input type="radio" id="r4" value="interval" v-model="replaymode2" class="ml-3 mr-1"/><label for="r4">Interval</label></div>
                </v-col>
                <v-col cols="2" style="float: left">Mission <v-select :disabled="replaymode2 == 'interval'" :items="missions" item-text="id" item-value="name" v-model="mission" @change="updateDate(mission)" dense></v-select></v-col>
                <v-col cols="2" style="float: left">From <date-picker :disabled="replaymode2 == 'mission'" v-model="dates.fromdate" /></v-col>
                <v-col cols="2" style="float: left">To <date-picker :disabled="replaymode2 == 'mission'" v-model="dates.todate" /></v-col>
                <v-col cols="1"><v-btn v-on:click="listenTopic(mission.id)">Replay</v-btn></v-col>
<!--                <template v-slot:default="{{minMaxValue(progressValue)}}"></template>-->
                <v-col cols="8" style="float: left"><v-progress-linear v-model="progressValue" color="blue-grey" height="25">{{ minMaxValue(progressValue) }}</v-progress-linear></v-col>
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
            replaymode: 'true',
            replaymode2: 'mission',
            remoteSocket: io.connect(utils.proxyurl),
            missions: [],
            mission: {},
            agrifarm: utils.agrifarm,
            prevTopic: "",
            dates: {fromdate: moment(), todate: moment(), current: moment()},
            progressValue: 0
        }
    },
    components: {
        mymap: mymap
    },
    methods: {
        minMaxValue(value) {
            const min = parseInt(moment(this.dates.fromdate).format('x'))
            const max = parseInt(moment(this.dates.todate).format('x'))
            const delta = (max - min) * (parseInt(value) / 100) + min
            return moment.unix(delta / 1000).format("DD/MM/YYYY hh:mm")
        },
        updateDate(mission) {
            this.missions.forEach(m => {
                if (m["name"] === mission || m["id"] === mission) {
                    this.dates.fromdate = moment(m["actualBeginTime"])
                    this.dates.todate = moment(m["actualEndTime"])
                    this.dates.current = this.dates.fromdate
                    return
                }
            })
        },
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
                if (task["actualBeginTime"] && task["actualEndTime"]) {
                    task["name"] = utils.getName(task)
                    tis.missions.push(task)
                }
            })
            if (tis.missions.length > 0) {
                tis.mission = tis.missions[0]
                tis.updateDate(tis.missions[0]["id"])
            }
        })
    }
}
