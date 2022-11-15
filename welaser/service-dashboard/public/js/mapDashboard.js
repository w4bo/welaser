const mapDashboard = {
    template: `
        <div>
            <v-row align="center" justify="center">
                <input type="radio" id="r2" value="realtime" v-model="replaymode" class="ml-3 mr-1" @input="listenTopic(agrifarm, 'realtime')"/><label for="r2">Real time</label>
                <input type="radio" id="r1" value="replay"   v-model="replaymode" class="ml-3 mr-1"/><label for="r1">Replay</label>
                <v-switch v-model="hideDetails" label="Hide details" hide-details></v-switch>
            </v-row>
            <v-row align="center" justify="center" v-if="replaymode === 'replay'">
                <v-col cols="1">
                    Mode
                    <div><input type="radio" id="r3" value="mission" v-model="replaymode2" class="ml-3 mr-1"/><label for="r3">Mission</label></div>
                    <div><input type="radio" id="r4" value="interval" v-model="replaymode2" class="ml-3 mr-1"/><label for="r4">Interval</label></div>
                </v-col>
                <v-col cols="2" style="float: left">Mission identifier <v-select :disabled="replaymode2 == 'interval'" :items="missions" item-text="id" item-value="name" v-model="mission" @change="updateDate(mission)" dense></v-select></v-col>
                <v-col cols="2" style="float: left">From <date-picker :disabled="replaymode2 == 'mission'" v-model="dates.fromdate" :config="options"/></v-col>
                <v-col cols="2" style="float: left">To <date-picker :disabled="replaymode2 == 'mission'" v-model="dates.todate" :config="options" /></v-col>
                <v-col cols="1">
                    <v-btn v-if="replaystatus === 'stop'" v-on:click="startReplay(dates.fromdate, dates.todate)">Start</v-btn>
                    <v-btn v-if="replaystatus === 'start'" v-on:click="stopReplay()">Stop</v-btn>
                </v-col>
            </v-row>
            <v-row align="center" justify="center" v-if="replaymode === 'replay'">
                <v-col cols="2" style="float: left">Selected entities
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
                <v-col cols="6" style="float: left"><v-progress-linear v-model="progressValue" color="blue-grey" height="25">{{ percentageToTimestamp(progressValue) }}</v-progress-linear></v-col>
            </v-row>
            <v-row align="center" justify="center"><v-col cols=8><mymap></mymap></v-col></v-row>
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
            options: {
                format: 'DD/MM/YYYY HH:mm:ss',
                useCurrent: false,
            },
            entities: [],
            selectedentities: [],
            devices: {},
            hideDetails: true,
            replaymode: 'realtime',
            replaymode2: 'mission',
            replaystatus: 'stop',
            remoteSocket: io.connect(utils.proxyurl),
            missions: [],
            mission: {},
            agrifarm: utils.agrifarm,
            prevTopic: "",
            dates: {fromdate: moment().subtract(1, "days"), todate: moment(), current: moment()},
            progressValue: 0
        }
    },
    components: {
        mymap: mymap
    },
    methods: {
        stopReplay() {
            this.replaystatus = 'stop'
            let id = window.setTimeout(function() {}, 0)
            while (id--) {
                window.clearTimeout(id) // will do nothing if no timeout with id is present
            }
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
            this.listenTopic(this.agrifarm, 'replay')
            let consumed = 0
            let prev = -1 // timestamp of the first entity from the replay
            const fromdatetime = parseFloat(moment(this.dates.fromdate, 'DD/MM/YYYY HH:mm:ss').format('x')) // ms
            const todatetime = parseFloat(moment(this.dates.todate, 'DD/MM/YYYY HH:mm:ss').format('x')) // ms
            const limit = 1000 // how many entities to retrieve at the same time
            const tis = this
            // get the distinct entities from the replay, and select the first one
            axios.get(utils.nodeurl + `/api/download/distinct/${utils.agrifarm}/${fromdatetime}/${todatetime}`).then(result => {
                tis.entities = result.data
                tis.toggleAll()
            })

            // recursively get all the entities from the replay (I need to do this since the entities could be too many to get them all at the same time)
            function get(count, acc) {
                if (tis.replaystatus === 'stop') return
                axios.get(utils.nodeurl + `/api/download/${utils.agrifarm}/${fromdatetime}/${todatetime}/${count}/${limit}`).then(result => {
                    const curresult = result.data // get the data
                    curresult.forEach(function (entity) { // compute the timestamp of the replay
                        entity["timestamp_replay"] = prev < 0 ? 0 : entity["timestamp_subscription"] - prev // the time to wait is the time between two entity updates
                        prev = parseFloat(entity["timestamp_subscription"])
                    })
                    acc.push(...curresult) // add it to the accumulator
                    if (curresult.length === limit) { // if there are more entities to consume...
                        setTimeout(function () { // ask for more entities every two seconds
                            get(count + limit, acc)
                        }, 2000)
                    }
                    if (count === 0) { // after the first population... begin with the replay
                        const topic = utils.getTopic(config.DRACO_REPLAY_TOPIC + "." + utils.agrifarm) // get the name of the topic
                        function emit(entity) { // publish the entity updates to kafka (only for the selected entities)
                            // We publish/consume events to/from kafka to avoid to change the logic of the components
                            // that in the "real-time" mode listen to messages from kafka
                            if (tis.replaystatus === 'stop') return
                            consumed = consumed + 1
                            if (tis.selectedentities.some(e => e === entity["id"])) {
                                // if this is one the entities the users want to see in the replay
                                tis.remoteSocket.emit("publish", { // publish the entity to kafka
                                    topic: topic,
                                    data: entity
                                })
                            }
                            replay(acc)
                        }
                        function replay(acc) {
                            if (tis.replaystatus === 'stop') return
                            if (acc.length > 0) { // if there are entities to replay
                                const entity = acc.shift() // take the first entity and remove it from the array
                                const delay = parseInt(entity["timestamp_replay"])
                                if (delay < 100) {
                                    // If the delay is too short, there is no need to invoke the setTimeout function
                                    // since it slow down the replay of messages
                                    emit(entity)
                                } else {
                                    setTimeout(function () { emit(entity) }, parseInt(entity["timestamp_replay"]))
                                }
                            }
                        }
                        replay(acc)
                    }
                })
            }
            const acc = [] // accumulator of the entities belonging to the replay
            get(0, acc) // begin the accumulation of the entities
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
            if (this.replaymode === 'replay') {
                this.progressValue = this.timestampToPercentage(data["timestamp_subscription"])
            }
        },
        listenTopic(topic, mode) {
            this.devices = []
            const newtopic = utils.getTopic((mode === 'replay' ? config.DRACO_REPLAY_TOPIC : config.DRACO_RAW_TOPIC) + "." + topic)
            if (newtopic !== this.prevTopic) {
                this.prevTopic = newtopic
                utils.kafkaProxyNewTopic(this.remoteSocket, newtopic, this.handleStreamData)
            }
        }
    },
    mounted() {
        this.listenTopic(utils.agrifarm, this.replaymode)
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
            }
        })
    }
}
