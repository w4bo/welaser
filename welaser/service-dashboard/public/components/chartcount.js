const chartcount = {
    template: `
        <v-card>
            <v-card-title class="pb-0">Received messages</v-card-title>
            <v-card-text class="flex"><canvas id="chartcount" style="width: 200px; height: 200px"></canvas></v-card-text>
        </v-card>`,
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
                    backgroundColor: [utils.colors[0]],
                    borderColor: [utils.colors[0]],
                    label: 'Count',
                }]
            }
        }
    },
    methods: {},
    mounted() {
        const mult = utils.chartresolution
        const ctx = document.getElementById('chartcount')
        const optionsAnimations = {
            animation: false,
            responsive: true,
            legend: {position: 'bottom'},
            hover: {mode: 'label'},
            scales: {
                x: {display: true},
                y: {
                    display: true,
                    ticks: {
                        suggestedMin: 0,
                        beginAtZero: true
                    }
                }
            },
        }

        const chart = new Chart(ctx, {type: 'line', data: this.dataset, options: optionsAnimations})
        function update(tis, timestamp, def) {
            if (timestamp) {
                const v = utils.round(timestamp, mult)
                if (tis.dict[v]) {
                    tis.dict[v] = tis.dict[v] + def
                } else {
                    if (tis.dataset.labels.length > utils.charthistorylength) {
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

        const tis = this
        utils.kafkaProxyNewTopic(io.connect(utils.proxyurl), config.DRACO_RAW_TOPIC + "." + utils.agrifarm, function (data) {
            update(tis, data["timestamp"], 1)
        })
        setInterval(function () {
            update(tis, new Date().getTime(), 0)
        }, mult)
    }
}
