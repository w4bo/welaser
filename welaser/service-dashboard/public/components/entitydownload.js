const entitydownload = {
    template: `
        <v-card>
            <v-card-title class="pb-0">Download entities</v-card-title>
            <v-card-text>
                Entity type <v-autocomplete :items="entitytypes" v-model="entitytype" style="padding: 0" dense></v-autocomplete>
                <div>Date range</div><v-date-picker v-model="dates" range></v-date-picker>
            </v-card-text>
            <v-card-actions class="flex-column align-center"><v-btn v-on:click="download(agrifarm, entitytype, dates[0], dates[1])" :disabled="entitytypes.length == 0">Download</v-btn></v-card-actions>
        </v-card>`,
    data() {
        return {
            entitytypes: [],
            entitytype: "",
            today: new Date(),
            dates: [],
            limitfrom: "1",
            limitto: "50000",
            agrifarm: utils.agrifarm
        }
    },
    methods: {
        downloadTextFile(text, name) {
            const a = document.createElement('a');
            const type = name.split(".").pop();
            a.href = URL.createObjectURL( new Blob([text], { type:`text/${type === "txt" ? "plain" : type}` }) );
            a.download = name;
            a.click();
        },
        download(domain, entitytype, datefrom, dateto) {
            const tis = this
            datefrom = moment(datefrom)
            datefrom.set({hour: 0, minute: 0, second: 0, millisecond: 0})
            dateto = moment(dateto)
            dateto.set({hour: 23, minute: 59, second: 59, millisecond: 999})
            axios.get(utils.nodeurl + `/api/download/${domain}/${entitytype}/${datefrom.format('x')}/${dateto.format('x')}/0/1000000`).then(entities => {
                tis.downloadTextFile(JSON.stringify(entities.data), 'download.json')
            })
        },
        formatDate(today) {
            return today.getFullYear() + "-" + (today.getMonth() + 1) + "-" + today.getDate()
        }
    },
    mounted() {
        this.dates = [this.formatDate(this.today), this.formatDate(this.today)]
        // load the distinct entitytype types
        axios.get(utils.nodeurl + `/api/entitytypes/${utils.agrifarm}`).then(result => {
            this.entitytypes = result.data
            this.entitytype = result.data[0]
        })
    }
}
