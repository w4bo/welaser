const Navbar = {
  template: `
    <div>
      <v-navigation-drawer v-model="drawer" absolute bottom temporary>
        <v-list nav dense>

          <v-list-item-group>

            <v-list-item>
            </v-list-item>

          </v-list-item-group>

        </v-list>
    </v-navigation-drawer>
    <v-app-bar :clipped-left="$vuetify.breakpoint.lgAndUp" app color="primary" dark>
      <v-app-bar-nav-icon @click.stop="drawer = !drawer"></v-app-bar-nav-icon>
      <v-toolbar-title class="ml-0 pl-4">
      </v-toolbar-title>
    </v-app-bar>
  </div>
  `,
  data(){
    return {
      drawer: false
    }
  },
  computed: {
  },
  methods: {
  },
  mounted(){
  }
}
