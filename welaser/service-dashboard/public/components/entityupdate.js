const entityupdate = {
    template: `
        <v-card>
            <v-card-title class="pb-0">Update entity</v-card-title>
            <v-card-text>
                Select entity to update
                <v-autocomplete :filter="customFilter" item-text="name" item-value="id" :items="selectableentities" v-model="selectedentity" @change="setSelectedUpdate(agrifarm, selectedentity)" style="padding: 0" dense>
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
                <v-btn v-on:click="update()" :disabled="selectableentities.length == 0">Update</v-btn>
                <v-btn v-on:click="download()" :disabled="selectableentities.length == 0">Download JSON</v-btn>
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
        customFilter(item, queryText, itemText) {
            const q = new Set(queryText.toLowerCase().split(' '))
            const i = new Set(item["name"].toLowerCase().split(' '))
            const intersect = new Set([...q].filter(function (j) {
                // need to check for substrings not only full strings
                const substring = [...i].filter(k => k.startsWith(j))
                return substring.length > 0
                // return i.has(j)
            }))
            return intersect.size === q.size
        },
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
                tis.response = "Update"
            }, function (err) {
                tis.showModal = true
                tis.success = false
                tis.response = err["response"]["data"]["description"]
            })
        },
        setSelectedUpdate(domain, id) {
            this.editorUpdate.set(this.selectableentities.filter(entity=> entity["id"] === id)[0])
        },
    },
    mounted() {
        // load the distinct entity names
        axios.get(utils.orionurl + `entities?options=keyValues&limit=1000`).then(result => {
            this.selectableentities = result.data
            if (result.data.length > 0) {
                this.selectedentity = result.data[0]["id"]
                this.setSelectedUpdate(utils.agrifarm, this.selectedentity)
            }
        })
        const options = {
            mode: 'code',
            modes: ['code', 'tree', 'view'],
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
