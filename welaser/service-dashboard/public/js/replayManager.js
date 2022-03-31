const replayManager = {
  template: `
    <v-main>
      <v-container>
        <v-row>
          <v-col cols=10>
            <v-select
              :items="missions"
              item-text="id"
              item-value="mission"
              label="Mission"
              v-model="selectedMission"
            >
            </v-select>
          </v-col>
          <v-col>
            <v-btn
              v-on:click="startReplay"
              elevation="2"
            >Start replay</v-btn>
          </v-col>
        </v-row>
        <v-row>
          <v-col cols=10>
            <v-select
              :items="replays"
              item-text="id"
              item-value="replay"
              label="Replay"
              v-model="selectedReplay"
            >
            </v-select>
          </v-col>
          <v-col>
            <v-btn
              v-on:click="stopReplay"
              elevation="2"
            >Stop replay</v-btn>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  `,
  data() {
    return {
     remoteSocket: null,
     localSocket: null,
     missions: [],
     selectedMission: "",
     replays: [],
     selectedReplay: ""
    }
  },
  methods: {

    startReplay() {
      data = {
        topic: this.replayManagerTopic,
        data: {
          type: "request",
          command: "start",
          mission: this.selectedMission
        }
      }
      this.remoteSocket.emit("publish", data)
    },

   stopReplay() {
      data = {
        topic: this.replayManagerTopic,
        data: {
          type: "request",
          command: "stop",
          replay: this.selectedReplay
        }
      }
      this.remoteSocket.emit("publish", data)
    },

    loadMissionsData() {
      axios
        .get(`http://${this.webServerIP}:${this.webServerPort}/api/topic/mission`)
        .then(response => {
          console.log(response)
          this.missions = response.data.map(e => {
            return {id: `${e.topic.split(".")[1]} - ${e.id}`, mission: `${e.topic.split(".")[3]}`}
          })
        })
    },

    loadReplaysData() {
      axios
        .get(`http://${this.webServerIP}:${this.webServerPort}/api/topic/replay`)
        .then(response => {
          console.log(response)
          this.replays = response.data.map(e => {
            return {id: `${e.id}`, mission: `${e.id}`}
          })
        })
    },

    init() {
      this.remoteSocket = io.connect(`http://${this.proxyIP}:${this.proxyPort}`)
      this.localSocket = io.connect(`http://${this.webServerIP}:${this.webServerPort}`)
      this.loadMissionsData()
      this.loadReplaysData()

      this.localSocket.on("updateTopic", data => {
        this.loadMissionsData()
        this.loadReplaysData()
      })
    }
 },
  mounted(){
    this.init()
  }
}
