const navbar = {
    template: `
        <div style="z-index: 10">
            <v-navigation-drawer v-model="drawer" fixed temporary>
                <v-list nav dense>
                    <v-list-item link><v-list-item-content><router-link class="nav-link" to="/">Mission GUI</router-link></v-list-item-content></v-list-item>
                    <v-list-item link><v-list-item-content><router-link class="nav-link" to="/missionplanner">Mission Planner</router-link></v-list-item-content></v-list-item>
                    <v-list-item link><v-list-item-content><router-link class="nav-link" to="/devicedata">Device data</router-link></v-list-item-content></v-list-item>
                    <v-list-item link><v-list-item-content><router-link class="nav-link" to="/debug">Dashboard</router-link></v-list-item-content></v-list-item>
                    <v-list-item link><v-list-item-content><router-link class="nav-link" to="/entitymanagement">Entity Management</router-link></v-list-item-content></v-list-item>
                    <v-list-item link><v-list-item-content><router-link class="nav-link" to="/statistics">Statistics</router-link></v-list-item-content></v-list-item>
                </v-list>
                <v-divider inset></v-divider>
                <v-spacer></v-spacer>
                <entitymenu v-if="$route.name === 'missiongui'"></entitymenu>
            </v-navigation-drawer>
            <v-app-bar :clipped-left="$vuetify.breakpoint.lgAndUp" app color="primary" dark dense>
                <v-app-bar-nav-icon @click.stop="drawer = !drawer"></v-app-bar-nav-icon>
                <v-toolbar-title class="ml-0 pl-4">
                    WeLASER
                    <v-btn depressed style="margin-left: 15px" color="error" v-if="this.$route.query.mode === 'sim'" @click="dropData()">Delete ALL data</v-btn>
                </v-toolbar-title>
            </v-app-bar>
        </div>`,
    data() {
        return {
            drawer: false,
        }
    },
    components: {
        entitymenu: entitymenu
    },
    methods: {
        dropData() {
            axios.get(utils.nodeurl + `/api/dropdata/${utils.agrifarm}`)
        }
    }
}
