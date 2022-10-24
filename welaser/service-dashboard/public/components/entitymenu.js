const entitymenu = {
    template: `
        <div>
        <template v-for="type in types">
            {{ type.name }}
            <template v-for="device in devicesbytype[type.name]">
                <div>
                    <input v-if="type.exclusive"  :id="device.data.id" :value="getName(device.data)" v-model="selectedbytype[type.name]" type="radio">
                    <input v-if="!type.exclusive" :id="device.data.id" :value="getName(device.data)" v-model="selectedbytype[type.name]" type="checkbox">
                    <label :for="device.data.id">{{ getName(device.data) }}</label>
                </div>
            </template>
        </template>
        </div>`,
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
                let name = utils.getName(Object.values(acc)[0]["data"])
                if (!type.exclusive) {
                    name = [name]
                }
                tis.$set(tis.selectedbytype, type.name, name)
                tis.$set(tis.devicesbytype, type.name, acc)
            })
        })
    }
}
