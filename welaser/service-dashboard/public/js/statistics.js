const statistics = {
    template: `
        <v-row justify="center">
            <v-col cols="3"><chartcount></chartcount></v-col>
            <v-col cols="3"><chartdelay></chartdelay></v-col>
        </v-row>`,
    data() {
        return {}
    },
    components: {
        chartcount: chartcount,
        chartdelay: chartdelay
    }
}
