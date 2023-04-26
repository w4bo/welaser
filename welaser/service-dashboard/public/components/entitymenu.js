const entitymenu = {
    template: `
        <v-list nav dense class="pl-10">
            <template v-for="type in types">
                <div v-if="devicesbytype[type.name]">{{ type.name }}</div>
                <template v-for="device in devicesbytype[type.name]">
                        <v-list-item>
                            <v-list-item-content class="nav-link">
                                <div>
                                    <input v-if="type.exclusive"  :id="device.data.id" :value="getName(device.data)" v-model="selectedbytype[type.name]" type="radio">
                                    <input v-if="!type.exclusive" :id="device.data.id" :value="getName(device.data)" v-model="selectedbytype[type.name]" type="checkbox">
                                    <label>
                                        <v-list-item-title v-html="getName(device.data)"></v-list-item-title>
                                        <v-list-item-subtitle v-html="device.data.id"></v-list-item-subtitle>
                                    </label>
                                </div>
                            </v-list-item-content>
                        </v-list-item>
                </template>
            </template>
        </v-list>`,
    data() {
        return {
            types: utils.missionguitypes,
            devicesbytype: {},
            selectedbytype: utils.selectedbytype,
        }
    },
    methods: {
        getName(device) {
            return utils.getName(device)
        },
    },
    mounted() {
        const tis = this
        this.types.forEach(function(type) {
            utils.getDevices(tis, type.name,  {}, function(acc) {
                if (Object.values(acc).length > 0) {
                    let name = utils.getName(Object.values(acc)[0]["data"])
                    if (!type.exclusive) {
                        name = [name]
                    }
                    tis.$set(tis.selectedbytype, type.name, name)
                    tis.$set(tis.devicesbytype, type.name, acc)
                }
            })
        })
    }
}
