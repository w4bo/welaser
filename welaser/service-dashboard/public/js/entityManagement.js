const entityManagement = {
    template: `
      <div style="padding: 0%">
          <v-row justify="center">
              <v-col cols=3>
                  <v-card>
                      <v-card-title class="pb-0">Download entities</v-card-title>
                      <v-card-text>
                          <p>Entity type <v-select :items="entitytypes" v-model="entitytype"></v-select></p>
                          <p><div>Date range</div><v-date-picker v-model="dates" range></v-date-picker></p>
                          <!-- <p>Limit from <input style="width: 100%; border: 1px solid #AAAAAA" placeholder="limitfrom" v-model="limitfrom"/></p>-->
                          <!-- <p>Limit to <input style="width: 100%; border: 1px solid #AAAAAA" placeholder="limitto" v-model="limitto"/></p>-->
                      </v-card-text>
                      <v-card-actions class="flex-column align-center">
                          <v-btn v-on:click="download(agrifarm, entitytype, dates[0], dates[1])">Download</v-btn>
                      </v-card-actions>
                  </v-card>
              </v-col>
          </v-row>
      </div>`,
    data() {
        return {
            entitytype: "",
            entitytypes: [],
            today: new Date(),
            dates: [],
            limitfrom: "1",
            limitto: "50000",
            nodeurl: `http://${config.IP}:${config.WEB_SERVER_PORT_EXT}`,
            agrifarm: "urn:ngsi-ld:AgriFarm:6991ac61-8db8-4a32-8fef-c462e2369055"
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
            axios.get(this.nodeurl + `/api/download/${domain}/${entitytype}/${datefrom}/${dateto}/foo/foo`).then(entities => {
                console.log(entities.data)
                tis.downloadTextFile(JSON.stringify(entities.data), 'download.json')
            })
        },
        formatDate(today) {
            return today.getFullYear() + "-" + (today.getMonth() + 1) + "-" + today.getDate()
        }
    },
    mounted() {
        const tis = this
        this.dates = [this.formatDate(this.today), this.formatDate(this.today)]
        axios.get(this.nodeurl + `/api/entitytypes/${this.agrifarm}`).then(entitytypes => {
            tis.entitytypes = entitytypes.data
            this.entitytype = entitytypes.data[0]
        })
    }
}
