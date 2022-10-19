const entityupdate = {
    template: `
        <v-card>
            <v-card-title class="pb-0">Update entity</v-card-title>
            <v-card-text>
                Select entity to update<v-select item-text="name" item-value="id" :items="selectableentities" v-model="selectedentity" @change="setSelectedUpdate(utils.agrifarm, selectedentity)" style="padding: 0" dense></v-select>
                <div><!-- <div v-show="visibleUpdate">-->
                    Modify the entity below
                    <div id="update"></div>
                </div>
            </v-card-text>
            <v-card-actions class="flex-column align-center"><v-btn v-on:click="update()">Update</v-btn></v-card-actions>
        </v-card>`,
    data() {
        return {
            visibleUpdate: false,
            selectedentity: "",
            selectableentities: [],
            editorUpdate: null,
        }
    },
    methods: {
        update() {
            this.visibleUpdate = false
            console.log(this.editorUpdate.get())
        },
        setSelectedUpdate(domain, id) {
            axios.get(utils.nodeurl + `/api/entity/${domain}/${id}`).then(entity => {
                this.visibleUpdate = true
                this.editorUpdate.set(entity.data)
            })
        },
    },
    mounted() {
        // load the distinct entity names
        axios.get(utils.nodeurl + `/api/entities/${utils.agrifarm}`).then(result => {
            this.selectableentities = result.data
            this.selectedentity = result.data[0]
            this.setSelectedUpdate(utils.agrifarm, this.selectedentity["id"])
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
    }
}
