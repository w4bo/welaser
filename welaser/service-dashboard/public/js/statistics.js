const statistics = {
    template: `
        <div style="padding: 1%">
            <v-row justify="center">
                <v-col cols="3"><chartcount></chartcount></v-col>
                <v-col cols="3"><chartdelay></chartdelay></v-col>
            </v-row>
        </div>`,
    data() {
        return {}
    },
    components: {
        chartcount: chartcount,
        chartdelay: chartdelay
    }
}
