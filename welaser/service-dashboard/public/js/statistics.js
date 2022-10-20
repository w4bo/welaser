const statistics = {
    template: `
        <div style="padding: 1%">
            <v-row justify="center">
                <v-col cols="3">
                    <v-card>
                        <v-card-title class="pb-0">Message workload</v-card-title>
                        <v-card-text class="flex"><canvas id="chart" style="width: 200px; height: 200px"></canvas></v-card-text>
                    </v-card>
                </v-col>
            </v-row>
        </div>`,
    data() {
        return {
            socket: io.connect(utils.proxyurl),
            dict: {},
            chartlabels: [],
            chartdata: [],
            dataset: {
                labels: [],
                fill: false,
                datasets: [{
                    data: [],
                    backgroundColor: [d3.schemeCategory10[0]],
                    borderColor: [d3.schemeCategory10[0]],
                    label: 'Count',
                }]
            }
        }
    },
    methods: {
        round(v, mult) {
            return new Date(Math.round(v / mult) * mult).toLocaleString() // to seconds
        }
    },
    mounted() {
        const mult = 5000
        const ctx = document.getElementById('chart')// .getContext('2d')
        // const optionsAnimations = { animation: false }
        const optionsAnimations = {
            animation: false,
            responsive: true,
            legend: {
                position: 'bottom',
            },
            hover: {
                mode: 'label'
            },
            scales: {
                x: {
                    display: true,
                    // type: 'time',
                    // time: {
                    //     unit: 'second'
                    // }
                },
                y: {
                    display: true,
                    ticks: {
                        suggestedMin: 0,
                        beginAtZero: true, // steps: 10, stepValue: 5, max: 100
                    }
                }
            },
            // title: {
            //     display: true,
            //     text: 'Message workload'
            // }
        }

        const chart = new Chart(ctx, {
            type: 'line',
            data: this.dataset,
            options: optionsAnimations
        })
        function update(tis, timestamp, def) {
            if (timestamp) {
                const v = tis.round(timestamp, mult)
                if (tis.dict[v]) {
                    tis.dict[v] = tis.dict[v] + def
                } else {
                    if (tis.dataset.labels.length > 50) {
                        delete tis.dict[Object.keys(tis.dict)[0]]
                    }
                    tis.dict[v] = def
                    tis.dataset.labels = []
                    tis.dataset.datasets[0].data = []
                    tis.chartlabels = tis.dataset.labels
                    tis.chartdata = tis.dataset.datasets[0].data
                    for (const [key, value] of Object.entries(tis.dict)) {
                        tis.chartlabels.push(key)
                        tis.chartdata.push(value)
                    }
                    chart.update()
                }
            }
        }
        const topic = utils.getTopic(utils.agrifarm)
        this.socket.emit("newtopic", topic)
        const tis = this
        this.socket.on(topic, data => {
            data = JSON.parse(data)
            update(tis, data["timestamp"], 1)
        })
        setInterval(function() { update(tis, new Date().getTime(), 0)}, mult)
    }
}
