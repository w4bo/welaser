const TFiware = {
	template: `
	<div>
		<v-container class="fill-height" fluid>
      <h3>Thermometers</h3>
      <v-row>
        <div v-for="therm in thermometers" :key=therm.id>
          <div class="float-left">
            <v-card class="ma-5">
              <v-card-title class="pb-0">{{therm.id}}</v-card-title>
              <v-card-text class="text--primary">
                <div>{{therm.temperature}}</div>
                <div>{{therm.isOn}}</div>
                <div>{{therm.time}}</div>
              </v-card-text>
              <v-card-actions>
                <v-btn v-on:click="turnOffTherm(therm.id)"> Spegni </v-btn>
                <v-btn v-on:click="turnOnTherm(therm.id)"> Accendi </v-btn>
              </v-card-actions>
            </v-card>
          </div>
        </div>
      </v-row>

        <h3>Cameras</h3>
        <v-row>
          <div v-for="camera in cameras" :key=camera.id>
            <div class="float-left">
              <v-card class="ma-5">
                <v-card-title class="pb-0">{{camera.id}}</v-card-title>
                <v-card-text class="text--primary">
                  <img :src="'data:image/png;base64,' + camera.image" style="height:20vh">
                  <div>{{camera.isOn}}</div>
                  <div>{{camera.time}}</div>
                </v-card-text>
                <v-card-actions>
                  <v-btn v-on:click="turnOffCamera(camera.id)"> Spegni </v-btn>
                  <v-btn v-on:click="turnOnCamera(camera.id)"> Accendi </v-btn>
                </v-card-actions>
              </v-card>
            </div>
          </div>
        </v-row>

   	</v-container>
	</div>
	`,
	data() {
		return {
      thermometers: "",
      cameras: "",
      socket: null
		}
	},
	methods: {
    turnOnTherm(id){
      axios.patch(`http://${this.webServerIP}:${this.webServerPort}/api/data/thermometer/${id}/on`)
    },
    turnOffTherm(id){
      axios.patch(`http://${this.webServerIP}:${this.webServerPort}/api/data/thermometer/${id}/off`)
    },
    turnOnCamera(id){
      axios.patch(`http://${this.webServerIP}:${this.webServerPort}/api/data/camera/${id}/on`)
    },
    turnOffCamera(id){
      axios.patch(`http://${this.webServerIP}:${this.webServerPort}/api/data/camera/${id}/off`)
    },
		loadDataTherm() {
      axios.get(`http://${this.webServerIP}:${this.webServerPort}/api/data/thermometer`)
      .then(response => this.thermometers = response.data)
		},
    loadDataCamera() {
      axios.get(`http://${this.webServerIP}:${this.webServerPort}/api/data/camera`)
      .then(response => this.cameras = response.data)
    },
		init() {
      this.socket = io()

      this.loadDataTherm()
      this.loadDataCamera()

      this.socket.on("therm-update", data => {
        this.loadDataTherm()
      })

      this.socket.on("camera-update", data => {
        this.loadDataCamera()
      })
		}
	},
	mounted(){
		this.init()
	}
}
