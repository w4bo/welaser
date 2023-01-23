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
                    <v-card-title v-if="device.name">{{device.name}}</v-card-title>
                    <v-card-title v-else>{{device.id}}</v-card-title>
                    <v-card-subtitle class="pb-0">{{device.id}}</v-card-subtitle>
                    <v-card-text class="flex">
                        <p v-show="device[property].notempty" v-for="property in device.controlledProperty">
                            {{ property }}:
                            <canvas :id="device.id + '-' + property" style="width: 200px"></canvas>
                        </p>
                    </v-card-text>
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
    methods: {
        iterate(device, tis, root) {
            if (typeof tis.devices[root.id] === "undefined") {
                console.log("Reassign")
                // if the device is unknown, create the object to visualize. Do not consider the timestamp attribute
                const v = Object.assign({}, device)
                delete v.timestamp
                tis.$set(tis.devices, root.id, v)
            }
            // for each device from the history... if the device has some controlled properties
            if (device.controlledProperty) { // this is not a nested device
                let i = 0 // for each controlled property
                device.controlledProperty.forEach(function (property) {
                    // set the controlled properties in the root
                    let props = tis.devices[root.id].controlledProperty
                    if (typeof props === "undefined") {
                        props = []
                        tis.$set(tis.devices[root.id], "controlledProperty", props)
                    }
                    if (!props.includes(property)) {
                        props.push(property)
                    }

                    let p = tis.devices[root.id][property] // check if the property has been collected
                    if (typeof p === "undefined") {
                        p = {"notempty": false}
                        tis.$set(tis.devices[root.id], property, p)
                    }
                    p = p[device.name] // check if the current id has been collected
                    if (typeof p === "undefined") {
                        p = {'timestamp': [], 'value': []}
                        tis.$set(tis.devices[root.id][property], device.name, p)
                    }
                    if (!isNaN(device.value[i])) {
                        tis.devices[root.id][property].notempty = true
                        p.value.push(device.value[i])
                        if (device.timestamp) { p.timestamp.push(utils.round(device.timestamp, 1))}
                        else { p.timestamp.push(utils.round(root.timestamp, 1)) }
                    }
                    i += 1
                })
            } else { // this is a nested device (i.e., a list of devices)
                device.value.forEach(function (nesteddevice) {
                    tis.iterate(nesteddevice, tis, root)
                })
            }
        },
        plot() {
            for (const [deviceid, device] of Object.entries(this.devices)) {
                device.controlledProperty.forEach(function (property) {
                    const datasets = {
                        fill: false,
                        datasets: []
                    }
                    let i = 0
                    for (const [name, p] of Object.entries(device[property])) {
                        if (name !== "notempty") {
                            datasets.labels = p.timestamp
                            datasets.datasets.push({
                                data: p.value,
                                label: name,
                                borderColor: utils.colors[i],
                                backgroundColor: utils.colors[i++ % utils.colors.length]
                            })
                        }
                    }
                    const ctx = document.getElementById(deviceid + "-" + property).getContext("2d");
                    console.log(JSON.parse(JSON.stringify(datasets)))
                    new Chart(ctx, {
                        type: 'line', data: datasets, options: {
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
        }
    },
    mounted() {
        const tis = this
        const min = parseFloat(moment(this.fromdate, 'DD/MM/YYYY HH:mm:ss').format('x'))
        const max = parseFloat(moment(this.todate, 'DD/MM/YYYY HH:mm:ss').format('x'))
        axios.get(utils.nodeurl + `/api/download/${utils.agrifarm}/Device/${min}/${max}/0/1000000`)
            .then(entities => {
                entities.data.forEach(function (device) {
                    tis.iterate(device, tis, device)
                })
                this.$forceUpdate();
                setTimeout(this.plot, 1000)
            })
    }
}
