const entityupdate = {
    template: `
        <v-card>
            <v-card-title class="pb-0">Update entity</v-card-title>
            <v-card-text>
                Select entity to update
                <v-autocomplete item-text="name" item-value="id" :items="selectableentities" v-model="selectedentity" @change="setSelectedUpdate(agrifarm, selectedentity)" style="padding: 0" dense>
                    <template v-slot:item="data">
                        <autocompleteitem :data="data"></autocompleteitem>
                    </template>
                </v-autocomplete>
                <div>
                    Modify the entity below
                    <div id="update"></div>
                </div>
                <p v-if="showModal"></p>
                <div :class="{success: success, error: !success}" v-if="showModal" @close="showModal = false">{{ response }}</div>
            </v-card-text>
            <v-card-actions class="flex-inline justify-content-center align-center">
                <v-btn v-on:click="update()">Update</v-btn>
                <v-btn v-on:click="download()">Download JSON</v-btn>
            </v-card-actions>
        </v-card>`,
    data() {
        return {
            visibleUpdate: false,
            selectedentity: "",
            selectableentities: [],
            editorUpdate: null,
            response: "",
            showModal: true,
            success: true,
            agrifarm: utils.agrifarm
        }
    },
    methods: {
        download() {
            utils.downloadJSON(this.editorUpdate.get())
        },
        update() {
            this.visibleUpdate = false
            const tis = this
            const entity = this.editorUpdate.get()
            entity["dateModified"] = moment().toISOString()
            utils.fiwareUpdateEntity(this.editorUpdate.get(), function (res) {
                tis.showModal = true
                tis.success = true
                tis.response = "OK" // "OK: " + res["statusText"]
            }, function (err) {
                tis.showModal = true
                tis.success = false
                tis.response = "Error: " + err["response"]["data"]["description"]
            })
        },
        setSelectedUpdate(domain, id) {
            axios.get(utils.nodeurl + `/api/entity/${domain}/${id}`).then(entity => {
                this.visibleUpdate = true
                this.showModal = false
                this.editorUpdate.set(entity.data)
            })
        },
    },
    mounted() {
        // load the distinct entity names
        axios.get(utils.nodeurl + `/api/entities/${utils.agrifarm}`).then(result => {
            this.selectableentities = result.data
            this.selectedentity = result.data[0]
            if (typeof this.selectedentity !== "undefined") {
                this.setSelectedUpdate(utils.agrifarm, this.selectedentity["id"])
            }
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
                    case 'id':
                        return {
                            field: false,
                            value: false
                        }
                    case 'type':
                        return {
                            field: false,
                            value: false
                        }
                    default:
                        return {
                            field: false,
                            value: true
                        }
                }
            }
        }
        this.editorUpdate = new JSONEditor(document.getElementById("update"), options)
    },
    components: {
        autocompleteitem: autocompleteitem
    }
}
