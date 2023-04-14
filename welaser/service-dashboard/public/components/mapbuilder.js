const mapbuilder = {
    template: `
        <v-card>
            <v-card-title class="pb-0">Create entities from GeoJSON</v-card-title>
            <v-card-text>
                <div>
                    Fill the GeoJSON below
                    <div id="geojson"></div>
                </div>
                <p v-if="showModal"></p>
                <div :class="{success: success, error: !success}" v-if="showModal" @close="showModal = false">{{ response }}</div>
            </v-card-text>
            <v-card-actions class="flex-column align-center"><v-btn v-on:click="create()">Create</v-btn></v-card-actions>
        </v-card>`,
    data() {
        return {
            editorCreate: null,
            response: "",
            showModal: true,
            success: true
        }
    },
    methods: {
        create() {
            const tis = this
            const data = this.editorCreate.get()
            utils.builderCreateMap(data, function (res) {
                tis.showModal = true
                tis.success = true
                tis.response = "OK: " + res["statusText"]
            }, function (err) {
                tis.showModal = true
                tis.success = false
                tis.response = "Error: " + err["response"]["data"]["msg"]
            })
        },
    },
    mounted() {
        this.editorCreate = new JSONEditor(document.getElementById("geojson"), {mode: 'code', modes: ['tree', 'code']})
        this.showModal = false
        const data = utils.defaultGeoJSON
        this.editorCreate.set(data)
    }
}
