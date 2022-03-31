const Navbar = {
    template: `
    <div>
      <v-navigation-drawer v-model="drawer" absolute bottom temporary>
        <v-list nav dense>
        
          <div>
            <v-list-item link>
              <v-list-item-content>
                <router-link class="nav-link" to="/">Dashboard</router-link>
              </v-list-item-content>
            </v-list-item>
          </div>

          <div>
            <v-list-item link>
              <v-list-item-content>
                <router-link class="nav-link" to="/domainManager">Domain Manager</router-link>
              </v-list-item-content>
            </v-list-item>
          </div>
          
          <div>
            <v-list-item link>
              <v-list-item-content>
                <router-link class="nav-link" to="/missionManager">Mission Manager</router-link>
              </v-list-item-content>
            </v-list-item>
          </div>

          <div>
            <v-list-item link>
              <v-list-item-content>
                <router-link class="nav-link" to="/replayManager">Replay Manager</router-link>
              </v-list-item-content>
            </v-list-item>
          </div>
          
          <div>
            <v-list-item link>
              <v-list-item-content>
                <router-link class="nav-link" to="/statistics">Statistics</router-link>
              </v-list-item-content>
            </v-list-item>
          </div>
          
        </v-list>
    </v-navigation-drawer>
    <v-app-bar :clipped-left="$vuetify.breakpoint.lgAndUp" app color="primary" dark>
      <v-app-bar-nav-icon @click.stop="drawer = !drawer"></v-app-bar-nav-icon>
      <v-toolbar-title class="ml-0 pl-4">
      </v-toolbar-title>
    </v-app-bar>
  </div>
  `,
    data() {
        return {
            drawer: false
        }
    },
    computed: {},
    methods: {},
    mounted() {
    }
}
