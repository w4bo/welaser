const entityManagement = {
    template: `
      <div style="padding: 1%">
          <v-row justify="center">
              <v-col cols=5>
                  <v-card>
                      <v-card-title class="pb-0">Create entity</v-card-title>
                      <v-card-text>
                          Select entity model<v-select :items="entitytypes" v-model="entitytype" @input="setSelectedCreate(agrifarm, entitytype)" style="padding: 0" dense></v-select>
                          <div v-show="visibleCreate">
                              Fill the entity below
                              <div id="create"></div>
                          </div>
                      </v-card-text>
                      <v-card-actions class="flex-column align-center"><v-btn v-on:click="create()">Create</v-btn></v-card-actions>
                  </v-card>
              </v-col>
              <v-col cols=5>
                  <v-card>
                      <v-card-title class="pb-0">Update entity</v-card-title>
                      <v-card-text>
                          Select entity to update<v-select item-text="name" item-value="id" :items="selectableentities" v-model="selectedentity" @change="setSelectedUpdate(agrifarm, selectedentity)" style="padding: 0" dense></v-select>
                          <div v-show="visibleUpdate">
                              Modify the entity below
                              <div id="update"></div>
                          </div>
                      </v-card-text>
                      <v-card-actions class="flex-column align-center"><v-btn v-on:click="update()">Update</v-btn></v-card-actions>
                  </v-card>
              </v-col>
              <v-col cols=3>
                  <v-card>
                      <v-card-title class="pb-0">Download entities</v-card-title>
                      <v-card-text>
                          Entity type <v-select :items="entitytypes" v-model="entitytype" style="padding: 0" dense></v-select>
                          <div>Date range</div><v-date-picker v-model="dates" range></v-date-picker>
                      </v-card-text>
                      <v-card-actions class="flex-column align-center"><v-btn v-on:click="download(agrifarm, entitytype, dates[0], dates[1])">Download</v-btn></v-card-actions>
                  </v-card>
              </v-col>
          </v-row>
      </div>`,
    data() {
        return {
            visibleUpdate: false,
            visibleCreate: false,
            entitytype: "",
            entitytypes: [],
            selectedentity: "",
            selectableentities: [],
            entity: {},
            today: new Date(),
            dates: [],
            editorCreate: null,
            editorUpdate: null,
            limitfrom: "1",
            limitto: "50000",
            nodeurl: `http://${config.IP}:${config.WEB_SERVER_PORT_EXT}`,
            agrifarm: utils.agrifarm
        }
    },
    methods: {
        uuidv4() {
            return utils.uuidv4()
        },
        update() {
            console.log(this.editorCreate.get())
            this.visibleCreate = false
        },
        setSelectedCreate(domain, type) {
            this.visibleCreate = true
            const data = {
                "id": `urn:nsgi-ld:${type}:${this.uuidv4()}`,
                "type": type,
                "name": `User-friendly name here`
            }
            console.log(data)
            this.editorCreate.set(data)
        },
        update() {
            console.log(this.editorUpdate.get())
            this.visibleUpdate = false
        },
        setSelectedUpdate(domain, id) {
            axios.get(this.nodeurl + `/api/entity/${domain}/${id}`).then(entity => {
                this.visibleUpdate = true
                this.editorUpdate.set(entity.data)
            })
        },
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
                tis.downloadTextFile(JSON.stringify(entities.data), 'download.json')
            })
        },
        formatDate(today) {
            return today.getFullYear() + "-" + (today.getMonth() + 1) + "-" + today.getDate()
        }
    },
    mounted() {
        this.dates = [this.formatDate(this.today), this.formatDate(this.today)]
        // load the distinct entity types
        axios.get(this.nodeurl + `/api/entitytypes/${this.agrifarm}`).then(result => {
            this.entitytypes = result.data
            this.entitytype = result.data[0]
            this.setSelectedCreate(this.agrifarm, this.entitytype)
        })
        // load the distinct entity names
        axios.get(this.nodeurl + `/api/entities/${this.agrifarm}`).then(result => {
            this.selectableentities = result.data
            this.selectedentity = result.data[0]
            this.setSelectedUpdate(this.agrifarm, this.selectedentity["id"])
        })

        const options = {
            mode: 'tree',
            modes: ['tree', 'view'], // 'code',
            onEditable: function (node) {
                // node is an object like:
                //   {
                //     field: 'FIELD',
                //     value: 'VALUE',
                //     path: ['PATH', 'TO', 'NODE']
                //   }
                switch (node.field) {
                    default:
                        return {
                            field: false,
                            value: true
                        }
                }
            }
        }
        this.editorUpdate = new JSONEditor(document.getElementById("update"), options)
        this.editorCreate = new JSONEditor(document.getElementById("create"), options)
    }
}
