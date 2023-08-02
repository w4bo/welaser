const entitycreate = {
    template: `
        <v-card>
            <v-card-title class="pb-0">Create entity</v-card-title>
            <v-card-text>
                Select entity model<v-autocomplete :items="entitytypes" v-model="entitytype" @input="setSelectedCreate(agrifarm, entitytype)" style="padding: 0" dense></v-autocomplete>
                <div>
                    Fill the entity below
                    <div id="create"></div>
                </div>
                <p v-if="showModal"></p>
                <div :class="{success: success, error: !success}" v-if="showModal" @close="showModal = false">{{ response }}</div>
            </v-card-text>
            <v-card-actions class="flex-inline justify-content-center align-center">
                <v-btn v-on:click="create()">Create</v-btn>
                <v-btn v-on:click="download()">Download JSON</v-btn>
            </v-card-actions>
        </v-card>`,
    data() {
        return {
            visibleCreate: false,
            entitytype: "AgriFarm",
            entitytypes: ["AgriFarm", "AgriParcel", "Device"],
            editorCreate: null,
            response: "",
            showModal: true,
            success: true,
            agrifarm: utils.agrifarm
        }
    },
    methods: {
        download() {
            utils.downloadJSON(this.editorCreate.get())
        },
        create() {
            this.visibleCreate = false
            const tis = this
            const data = this.editorCreate.get()
            data["domain"] = this.agrifarm
            data["dateCreated"] = moment().toISOString()
            utils.fiwareCreateEntity(data, function (res) {
                tis.showModal = true
                tis.success = true
                tis.response = res["statusText"]
            }, function (err) {
                tis.showModal = true
                tis.success = false
                tis.response = err["response"]["data"]["description"]
            })
        },
        setSelectedCreate(domain, type) {
            this.visibleCreate = true
            this.showModal = false
            const data = {
                "id": `urn:ngsi-ld:${type}:${utils.uuidv4()}`,
                "type": type,
                "name": `User-friendly name here`,
                "createdBy": `A user from the web gui`,
                "areaServed": utils.agrifarm
            }
            this.editorCreate.set(type === "AgriFarm" ? utils.copenhagenFarm : data)
        },
    },
    mounted() {
        // load the distinct entity types
        axios.get(utils.nodeurl + `/api/entitytypes/${utils.agrifarm}`).then(result => {
            this.entitytypes = [...new Set(this.entitytypes.concat(result.data))].sort()
            this.setSelectedCreate(utils.agrifarm, this.entitytype)
        })
        const schema = {
            "title": "Entity",
            "description": "An entity from the FIWARE ecosystem",
            "type": "object",
            "properties": {
                "id": {
                    "title": "Id",
                    "description": "The unique id of the entity",
                    "examples": [
                        "urn:ngsi-ld:AgriFarm:6991ac61-8db8-4a32-8fef-c462e2369055",
                        "urn:ngsi-ld:AgriParcel:d50ec8b0-9719-45ab-8ab8-a831e4d341c2"
                    ],
                    "type": "string",
                },
            },
            "required": ["id", "type", "name", "createdBy", "areaServed"]
        }

        const options = {
            schema: schema,
            mode: 'code',
            modes: ['code', 'tree', 'view'],
            onValidate: function (json) {
                const errors = []
                if (json.id && !json.id.startsWith("urn:ngsi-ld:")) {
                    errors.push({
                        path: ['id'],
                        message: "The id should start with 'urn:ngsi-ld:'"
                    })
                }
                if (json.createdBy && json.createdBy.length === 0) {
                    errors.push({
                        path: ['createdBy'],
                        message: "The field should not be empty"
                    })
                }
                return errors
            },
            onEditable: function (node) {
                switch (node.field) {
                    case 'areaServed':
                    case 'type':
                        return { field: false, value: false }
                    default:
                        return { field: false, value: true }
                }
            }
        }
        this.editorCreate = new JSONEditor(document.getElementById("create"), options)
    }
}
