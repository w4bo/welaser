const missionManager = {
    template: `
    <v-main>
      <v-container>
        <v-row>
          <v-col cols=5>
             <v-select
              :items="domains"
              item-text="id"
              item-value="domain"
              label="Domain"
              v-model="selectedDomain"
            >
            </v-select>
          </v-col>
          <v-col cols=5>
            <input v-model="missionName" placeholder="Mission name">
          </v-col>
          <v-col cols=2>
            <v-btn
              v-on:click="startMission"
              elevation="2"
            >Start mission</v-btn>
          </v-col>
        </v-row>
        <v-row>
          <v-col cols=10>
            <v-select
              :items="missions"
              item-text="id"
              item-value="mission"
              label="Mission"
              v-model="selectedMission"
            ></v-select>
          </v-col>
          <v-col cols=2>
            <v-btn
              v-on:click="stopMission"
              elevation="2"
            >Stop mission</v-btn>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  `,
    data() {
        return {
            remoteSocket: null,
            localSocket: null,
            domains: [],
            missions: [],
            selectedDomain: "",
            selectedMission: "",
            missionName: ""
        }
    },
    methods: {
        init() {
            this.remoteSocket = io.connect(`http://${this.proxyIP}:${this.proxyPort}`)
            this.localSocket = io.connect(`http://${this.webServerIP}:${this.webServerPort}`)
            this.loadMissionsData()
            this.loadDomainsData()

            this.localSocket.on("updateTopic", data => {
                this.loadMissionsData()
                this.loadDomainsData()
            })
        },

        startMission() {
            data = {
                topic: this.missionManagerTopic,
                data: {
                    type: "request",
                    command: "start",
                    mission: this.missionName,
                    domain: this.selectedDomain
                }
            }
            this.remoteSocket.emit("publish", data)
        },

        stopMission() {
            data = {
                topic: this.missionManagerTopic,
                data: {
                    type: "request",
                    command: "stop",
                    mission: this.selectedMission,
                }
            }
            console.log(data)
            this.remoteSocket.emit("publish", data)
        },

        loadMissionsData() {
            axios
                .get(`http://${this.webServerIP}:${this.webServerPort}/api/topic/mission`)
                .then(response => {
                    this.missions = response.data.map(e => {
                        return {id: `${e.topic.split(".")[1]} - ${e.id}`, mission: `${e.topic.split(".")[3]}`}
                    })
                })
        },

        loadDomainsData() {
            axios
                .get(`http://${this.webServerIP}:${this.webServerPort}/api/topic/domain`)
                .then(response => {
                    this.domains = response.data.map(e => {
                        return {id: `${e.id}`, domain: `${e.id}`}
                    })
                })
        },
    },
    mounted() {
        this.init()
    }
}
