const devicedata = {
    template: `
        <div>
            <v-row justify="center">
                <v-col cols="2" style="float: left">From <date-picker v-model="fromdate" :config="options"/></v-col>
                <v-col cols="2" style="float: left">To <date-picker v-model="todate" :config="options"/></v-col>
            </v-row>
            <v-row justify="center">    
                <v-col cols="3" v-for="device in devices">
                <v-card>
                    <div v-if="device.controlledProperty">
                        <v-card-title v-if="device.name">{{device.name}}</v-card-title>
                        <v-card-title v-else>{{device.id}}</v-card-title>
                        <v-card-subtitle class="pb-0">{{device.id}}</v-card-subtitle>
                        <v-card-text class="flex">
                            <p v-show="device[property].timestamp.length > 0" v-for="property in device.controlledProperty">
                                {{ property }}:
                                {{ device[property].timestamp.length }}
                                <canvas :id="device.id + '-' + property" style="width: 200px"></canvas>
                            </p>
                        </v-card-text>
                    </div>
                    </v-card>
                </v-col>
            </v-row>
        </div>`,
    data() {
        return {
            devices: {},
            options: utils.dataTimeOptions,
            fromdate: moment().subtract(1, "days"),
            todate: moment()
        }
    },
    mounted() {
        const tis = this
        const min = parseFloat(moment(this.fromdate, 'DD/MM/YYYY HH:mm:ss').format('x'))
        const max = parseFloat(moment(this.todate, 'DD/MM/YYYY HH:mm:ss').format('x'))
        axios.get(utils.nodeurl + `/api/download/${utils.agrifarm}/Device/${min}/${max}/0/1000000`)
            .then(entities => {
                entities.data.forEach(function (device) {
                    // for each device from the history... if the device has some controlled properties
                    if (device.controlledProperty) {
                        if (typeof tis.devices[device.id] === "undefined") {
                            // if the device is unknown, create the object to visualize. Do not consider the timestamp attribute
                            const v = Object.assign({}, device)
                            delete v.timestamp
                            tis.$set(tis.devices, device.id, v)
                        }
                        let i = 0
                        device.controlledProperty.forEach(function (property) {
                            let p = tis.devices[device.id][property]
                            if (typeof p === "undefined") {
                                p = {'timestamp': [], 'value': []}
                                tis.$set(tis.devices[device.id], property, p)
                                // tis.devices[device.id][property] = p
                            }
                            if (!isNaN(device.value[i]) /*typeof device.value[i] === 'float'*/) {
                                p.value.push(device.value[i])
                                p.timestamp.push(utils.round(device.timestamp, 1))
                            }
                            i += 1
                        })
                    }
                })
                tis.$forceUpdate();

                setTimeout(function () {
                    for (const [deviceid, device] of Object.entries(tis.devices)) {
                        device.controlledProperty.forEach(function (property) {
                            const p = device[property]
                            const dataset = {
                                labels: p.timestamp,
                                fill: false,
                                datasets: [{data: p.value, label: '',}] // device.name
                            }
                            const ctx = document.getElementById(deviceid + "-" + property).getContext("2d");
                            new Chart(ctx, {
                                type: 'line', data: dataset, options: {
                                    animation: false,
                                    responsive: true,
                                    legend: {position: 'bottom'},
                                    hover: {mode: 'label'},
                                    scales: {
                                        x: {display: true},
                                        y: {display: true}
                                    },
                                }
                            })
                        })
                    }
                }, 1000)
            })
    }
}
