const navbar = {
    template: `
        <div style="z-index: 10">
            <v-navigation-drawer v-model="drawer" absolute temporary>
                <v-list nav dense>
                    <v-list-item link><v-list-item-content><router-link class="nav-link" to="/">Mission GUI</router-link></v-list-item-content></v-list-item>
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
                <v-toolbar-title class="ml-0 pl-4">WeLaser</v-toolbar-title>
            </v-app-bar>
        </div>`,
    data() {
        return {
            drawer: false,
        }
    },
    components: {
        entitymenu: entitymenu
    }
}
