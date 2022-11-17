const entityManagement = {
    template: `
        <v-row justify="center">
            <v-col cols=5><entitycreate></entitycreate></v-col>
            <v-col cols=5><entityupdate></entityupdate></v-col>
            <v-col cols=3><entitydownload></entitydownload></v-col>
            <v-col cols=3><missionplanner></missionplanner></v-col>
        </v-row>`,
    data() {
        return {}
    },
    components: {
        missionplanner: missionplanner,
        entitycreate: entitycreate,
        entityupdate: entityupdate,
        entitydownload: entitydownload
    },
    methods: {},
    mounted() {
    }
}
