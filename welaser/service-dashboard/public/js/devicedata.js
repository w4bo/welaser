const devicedata = {
    template: `
        <v-row justify="center">
            <v-col cols="3"><chartcount></chartcount></v-col>
            <v-col cols="3"><chartdelay></chartdelay></v-col>
        </v-row>`,
    data() {
        return {
            devices: {}
        }
    },
    mounted() {
        const tis = this
        axios.get(utils.nodeurl + `/api/download/${utils.agrifarm}/Device/${moment().subtract(1, "days").format('x')}/${moment().format('x')}/0/1000000`)
            .then(entities => {
                tis.devices = entities.data
                console.log(tis.devices)
            })
    }
}

/**
 * GET ALL DEVICES FROM THE AGRIFARM,
 * FOR EACH DEVICE PLOT THE STORED DATA
 */
