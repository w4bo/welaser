const statistics = {
    template: `
    <v-main>
      <v-container>
      <v-row>
        <v-col cols=12>
            <p v-html="data"></p>
        </v-col>
      </v-row>
      </v-container>
    </v-main>
  `,
    data() {
        return {
            data: ""
        }
    },
    methods: {
        performGet(IP, PORT) {
          axios
            .get(`http://${IP}:${PORT}/api/statistics`)
            .then(response => {
                this.data = JSON.stringify(response.data)
                console.log(this.data)
            })
        },
        init() {
            //function, interval, [args]
            setInterval(this.performGet, 1000, this.webServerIP, this.webServerPort)
        }
    },
    mounted() { // called by Vue.js when the component is shown
        this.init()
    }
}
