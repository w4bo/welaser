const chartdelay = {
    template: `
        <v-card>
            <v-card-title class="pb-0">Average message delay (ms)</v-card-title>
            <v-card-text class="flex"><canvas id="chartdelay" style="width: 200px; height: 200px"></canvas></v-card-text>
        </v-card>`,
    data() {
        return {
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
                    label: 'OCB',
                }, {
                    data: [],
                    backgroundColor: [utils.colors[1]],
                    borderColor: [utils.colors[1]],
                    label: 'GUI',
                }]
            }
        }
    },
    methods: {},
    mounted() {
        const mult = utils.chartresolution
        const ctx = document.getElementById('chartdelay')
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

        function update(tis, timestamp, timestamp_subscription, timestamp_gui, def) {
            if (timestamp && timestamp_subscription && timestamp_gui) {
                const v = utils.round(timestamp, mult)
                if (tis.dict[v]) {
                    tis.dict[v]["count"] = tis.dict[v]["count"] + def
                    tis.dict[v]["ts"] = tis.dict[v]["ts"] + timestamp_subscription - timestamp
                    tis.dict[v]["tg"] = tis.dict[v]["tg"] + timestamp_gui - timestamp
                } else {
                    if (tis.dataset.labels.length > utils.charthistorylength) {
                        delete tis.dict[Object.keys(tis.dict)[0]]
                    }
                    tis.dict[v] = {"count": 0, "ts": 0, "tg": 0}
                    tis.dataset.labels = []
                    tis.dataset.datasets[0].data = []
                    tis.dataset.datasets[1].data = []
                    for (const [key, value] of Object.entries(tis.dict)) {
                        const count = value["count"]
                        if (count > 0) {
                            tis.dataset.labels.push(key)
                            tis.dataset.datasets[0].data.push(value["ts"] / count)
                            tis.dataset.datasets[1].data.push(value["tg"] / count)
                        }
                    }
                    chart.update()
                }
            }
        }

        const tis = this
        utils.kafkaProxyNewTopic(io.connect(utils.proxyurl), config.DRACO_RAW_TOPIC + "." + utils.agrifarm, function (data) {
            update(tis, data["timestamp"], data["timestamp_subscription"], new Date().getTime(), 1)
        })
        setInterval(function () {
            update(tis, new Date().getTime(), 0, 0, 0)
        }, mult)
    }
}
