const entitycreate = {
    template: `
        <v-card>
            <v-card-title class="pb-0">Create entity</v-card-title>
            <v-card-text>
                Select entity model<v-select :items="entitytypes" v-model="entitytype" @input="setSelectedCreate(agrifarm, entitytype)" style="padding: 0" dense></v-select>
                <div><!-- <div v-show="visibleCreate">-->
                    Fill the entity below
                    <div id="create"></div>
                </div>
                <p v-if="showModal"></p>
                <div :class="{success: success, error: !success}" v-if="showModal" @close="showModal = false">{{ response }}</div>
            </v-card-text>
            <v-card-actions class="flex-column align-center"><v-btn v-on:click="create()">Create</v-btn></v-card-actions>
        </v-card>`,
    data() {
        return {
            visibleCreate: false,
            entitytype: "",
            entitytypes: [],
            editorCreate: null,
            response: "",
            showModal: true,
            success: true,
            agrifarm: utils.agrifarm
        }
    },
    methods: {
        create() {
            this.visibleCreate = false
            const tis = this
            utils.fiwareCreateEntity(this.editorCreate.get(), function (res) {
                tis.showModal = true
                tis.success = true
                tis.response = "OK: " + res["statusText"]
            }, function (err) {
                tis.showModal = true
                tis.success = false
                tis.response = "Error: " + err["response"]["data"]["description"]
            })
        },
        setSelectedCreate(domain, type) {
            this.visibleCreate = true
            this.showModal = false
            const data = {
                "id": `urn:nsgi-ld:${type}:${utils.uuidv4()}`,
                "type": type,
                "name": `User-friendly name here`
            }
            this.editorCreate.set(data)
        },
    },
    mounted() {
        // load the distinct entity types
        axios.get(utils.nodeurl + `/api/entitytypes/${utils.agrifarm}`).then(result => {
            this.entitytypes = result.data
            this.entitytype = result.data[0]
            this.setSelectedCreate(utils.agrifarm, this.entitytype)
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
        this.editorCreate = new JSONEditor(document.getElementById("create"), options)
    }
}
