const domainManager = {
    template: `
    <v-main>
      <v-container>
      <v-row>
        <v-col cols=10>
          <input v-model="domainName" placeholder="Domain">
        </v-col>
        <v-col cols=2>
          <v-btn
            v-on:click="createDomain"
            elevation="2"
          >Create</v-btn>
        </v-col>
      </v-row>
      </v-container>
    </v-main>
  `,
    data() {
        return {
            socket: null,
            domainName: ""
        }
    },
    methods: {
        init() {
            this.socket = io.connect(`http://${this.proxyIP}:${this.proxyPort}`)
            console.log(this.domainManagerTopic)
        },
        createDomain() {
            console.log("create domain", this.domainName)
            data = {
                topic: this.domainManagerTopic,
                data: {
                    type: "request",
                    domain: this.domainName,
                }
            }
            console.log(data)
            this.socket.emit("publish", data)
        }
    },
    mounted() {
        this.init()
    }
}
