const mapDashboard = {
    template: `
        <div>
            <v-row align="center" justify="center">
                <v-radio-group v-model="replaymode" row :disabled="replaystatus == 'start'">
                    <v-radio label="Real time" value="realtime" @change="listenTopic(agrifarm, 'realtime')"></v-radio>
                    <v-radio label="Replay"    value="replay"   @change="listenTopic(agrifarm, 'replay')"></v-radio>
                </v-radio-group>
                <v-switch v-model="hideDetails" label="Hide details" hide-details></v-switch>
            </v-row>
            <v-row align="center" justify="center" v-if="replaymode === 'replay'">
                <v-col cols="1">
                    Mode
                    <div><input :disabled="replaystatus == 'start'" type="radio" id="r3" value="mission"  v-model="replaymode2" class="ml-3 mr-1"/><label for="r3">Mission</label></div>
                    <div><input :disabled="replaystatus == 'start'" type="radio" id="r4" value="interval" v-model="replaymode2" class="ml-3 mr-1"/><label for="r4">Interval</label></div>
                </v-col>
                <v-col cols="2" style="float: left">Mission identifier <v-select :disabled="(replaystatus == 'stop' && replaymode2 == 'interval') || replaystatus == 'start'" :items="missions" item-text="id" item-value="name" v-model="mission" @change="updateDate(mission)" dense></v-select></v-col>
                <v-col cols="2" style="float: left">From <date-picker :disabled="(replaystatus == 'stop' && replaymode2 == 'mission') || replaystatus == 'start'" v-model="dates.fromdate" :config="options"/></v-col>
                <v-col cols="2" style="float: left">To <date-picker   :disabled="(replaystatus == 'stop' && replaymode2 == 'mission') || replaystatus == 'start'" v-model="dates.todate" :config="options" /></v-col>
                <v-col cols="1">
                    <v-btn v-if="replaystatus === 'stop'" v-on:click="startReplay(dates.fromdate, dates.todate)">Start</v-btn>
                    <v-btn v-if="replaystatus === 'start'" v-on:click="stopReplay()">Stop</v-btn>
                </v-col>
            </v-row>
            <v-row align="center" justify="center" v-if="replaystatus === 'start'">
                <v-col cols="2" style="float: left">
                    <v-select attach chips @change="toggleSingle($event)" :items="entities" item-text="id" item-value="id" v-model="selectedentities" dense multiple>
                        <template v-slot:selection="{ item, index }">
                            <v-chip v-if="index === 0"><span>{{ item }}</span></v-chip>
                            <span v-if="index === 1" class="grey--text text-caption">(+{{ selectedentities.length - 1 }} others)</span>
                        </template>
                        <template v-slot:prepend-item>
                            <v-list-item ripple @mousedown.prevent @click="toggleAll"><v-list-item-content><v-list-item-title>Select All</v-list-item-title></v-list-item-content></v-list-item>
                            <v-list-item ripple @mousedown.prevent @click="toggleNone"><v-list-item-content><v-list-item-title>Deselect All</v-list-item-title></v-list-item-content></v-list-item>
                            <v-divider class="mt-2"></v-divider>
                        </template>
                    </v-select>
                </v-col>
                <v-col cols="5" style="float: left"><v-progress-linear v-model="progressValue" :active="replaystatus === 'start'" @change="startReplay(percentageToTimestamp(progressValue), dates.todate)" color="blue-grey" height="25">{{ percentageToTimestamp(progressValue) }}</v-progress-linear></v-col>
                <v-col cols="1">
                    <v-btn-toggle cols="1" v-if="replaystatus === 'start'" v-model="speed" shaped mandatory>
                        <v-btn value="1">1x</v-btn>
                        <v-btn value="2">2x</v-btn>
                        <v-btn value="4">4x</v-btn>
                    </v-btn-toggle>
                </v-col>
            </v-row>
            <v-row align="center" justify="center">
                <v-col>
                    <mymap ref="mymap" cols=8 v-if="replaymode === 'replay'" topicroot="replay"/>
                    <mymap2 cols=8 v-else-if="replaymode === 'realtime'" topicroot="raw"/>
                </v-col>
            </v-row>
            <v-row justify="center">
                <template v-for="device in Object.values(devices)">
                    <v-col cols=3>
                        <v-card :color="device.color">
                            <v-card-title class="pb-0">{{device.id}}</v-card-title>
                            <v-card-text class="flex">
                                <div v-if="device.data.type == 'Device'" v-html="updateCards(device.data)"></div>
                                <table v-else><template><recursivetable :k="''" :v="device.data" prevkey="device.id" /></template></table>
                            </v-card-text>
                            <v-card-actions v-if="replaymode === 'realtime'" >
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
            options: utils.dataTimeOptions,
            entities: [],
            selectedentities: [],
            devices: {},
            hideDetails: true,
            replaymode: 'realtime',
            replaymode2: 'interval',
            replaystatus: 'stop',
            remoteSocket: io.connect(utils.proxyurl),
            missions: [],
            mission: {},
            speed: "",
            agrifarm: utils.agrifarm,
            prevTopic: "",
            dates: {fromdate: moment().subtract(1, "days"), todate: moment()},
            progressValue: 0,
        }
    },
    components: {
        mymap: mymap,
        mymap2: mymap,
        recursivetable: recursivetable
    },
    methods: {
        stopReplay() {
            this.replaystatus = 'stop'
        },
        toggleAll() {
            this.selectedentities = this.entities
        },
        toggleNone() {
            this.selectedentities = []
            this.devices = {}
        },
        toggleSingle(event) {
            const keys = Object.keys(this.devices)
            keys.forEach(key => {
                if (!this.selectedentities.includes(key)) {
                    delete this.devices[key]
                }
            })
        },
        startReplay(from, to) {
            this.replaystatus = 'start'
            this.devices = {}

            // clean all the timeouts
            let id = window.setTimeout(function() {}, 0);
            while (id--) window.clearTimeout(id); // will do nothing if no timeout with id is present

            let prev = -1 // timestamp of the first entity from the replay
            const fromdatetime = parseFloat(moment(from, 'DD/MM/YYYY HH:mm:ss').format('x')) // ms
            const todatetime = parseFloat(moment(to, 'DD/MM/YYYY HH:mm:ss').format('x')) // ms
            const limit = 1000 // how many entities to retrieve at the same time
            const tis = this
            // get the distinct entities from the replay, and select the first one
            axios.get(utils.nodeurl + `/api/download/distinct/${utils.agrifarm}/${fromdatetime}/${todatetime}`).then(result => {
                tis.entities = result.data
                tis.selectedentities = tis.entities
            })

            // recursively get all the entities from the replay (I need to do this since the entities could be too many to get them all at the same time)
            function get(count, acc) {
                if (tis.replaystatus === 'stop') return
                axios.get(utils.nodeurl + `/api/download/${utils.agrifarm}/${fromdatetime}/${todatetime}/${count}/${limit}`).then(result => {
                    const curresult = result.data // get the data
                    curresult.forEach(function (entity) { // compute the timestamp of the replay
                        entity["delay_replay"] = prev < 0 ? 0 : entity["timestamp_subscription"] - prev // the time to wait is the time between two entity updates
                        prev = parseFloat(entity["timestamp_subscription"])
                    })
                    acc.push(...curresult) // add it to the accumulator
                    if (curresult.length === limit) { // if there are more entities to consume...
                        setTimeout(function () { // ask for more entities every two seconds
                            get(count + limit, acc)
                        }, 2000)
                    }
                    if (count === 0) { // after the first population... begin with the replay
                        function emit(entity) {
                            if (tis.replaystatus === 'stop') return
                            if (tis.selectedentities.some(e => e === entity["id"])) {
                                tis.handleStreamData(entity)
                                tis.$refs.mymap.handleStreamData(entity)
                            }
                            tis.progressValue = tis.timestampToPercentage(entity["timestamp_subscription"])
                            replay(acc)
                        }
                        function replay(acc) {
                            if (tis.replaystatus === 'stop') return
                            if (acc.length > 0) { // if there are entities to replay
                                const entity = acc.shift() // take the first entity and remove it from the array
                                const delay = parseInt(entity["delay_replay"]) / tis.speed
                                // console.log("Waiting for: " + delay)
                                if (delay < 100) {
                                    // If the delay is too short, there is no need to invoke the setTimeout function
                                    // since it slow down the replay of messages
                                    emit(entity)
                                } else {
                                    setTimeout(function () { emit(entity) }, delay)
                                }
                            }
                        }
                        replay(acc)
                    }
                })
            }
            get(0, []) // begin the accumulation of the entities
        },
        percentageToTimestamp(value) {
            const min = parseFloat(moment(this.dates.fromdate, 'DD/MM/YYYY HH:mm:ss').format('x')) // ms
            const max = parseFloat(moment(this.dates.todate, 'DD/MM/YYYY HH:mm:ss').format('x')) // ms
            const delta = (max - min) * (parseFloat(value) / 100) + min
            return moment.unix(delta / 1000).format("DD/MM/YYYY HH:mm:ss")
        },
        timestampToPercentage(value) {
            const min = parseFloat(moment(this.dates.fromdate, 'DD/MM/YYYY HH:mm:ss').format('x')) // ms
            const max = parseFloat(moment(this.dates.todate, 'DD/MM/YYYY HH:mm:ss').format('x')) // ms
            return (value - min) / (max - min) * 100
        },
        updateDate(mission) {
            this.missions.forEach(m => {
                if (m["name"] === mission || m["id"] === mission) {
                    this.dates.fromdate = moment(m["actualBeginTime"])
                    this.dates.todate = moment(m["actualEndTime"])
                    return
                }
            })
        },
        updateCards(data) {
            return utils.renderRows(data, this.hideDetails)
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
        listenTopic(topic, mode) {
            const newtopic = utils.getTopic((mode === 'replay' ? config.DRACO_REPLAY_TOPIC : config.DRACO_RAW_TOPIC) + "." + topic)
            if (newtopic !== this.prevTopic) {
                this.devices = {}
                utils.kafkaProxyNewTopic(this.remoteSocket, newtopic, this.handleStreamData, this.prevTopic)
                this.prevTopic = newtopic
            }
        }
    },
    mounted() {
        this.listenTopic(utils.agrifarm, this.replaymode)
        const tis = this
        utils.getDevices(this, "Task", {}, function(acc) {
            Object.values(acc).forEach(function(task) {
                task = task.data
                if (task["actualBeginTime"] && task["actualEndTime"] && task["taskType"] === "Mission") {
                    task["name"] = utils.getName(task)
                    tis.missions.push(task)
                }
            })
            if (tis.missions.length > 0) {
                tis.mission = tis.missions[0]
            }
        })
    }
}
