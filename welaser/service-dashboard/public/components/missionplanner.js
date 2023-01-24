const missionplanner = {
    template: `
        <v-card>
          <v-card-title class="pb-0">Create mission plan</v-card-title>
          <v-card-text>
              Date <date-picker v-model="date" :config="options"/></v-col>
              Robot <v-select item-text="name" item-value="id" :items="robots" v-model="robot" style="padding: 0" dense></v-select>
              Farm <v-select :items="farms" v-model="farm" style="padding: 0" dense></v-select>
              From (place) <v-select :items="froms" v-model="from" style="padding: 0" dense></v-select>
              Parcel <v-select :items="parcels" v-model="parcel" style="padding: 0" dense></v-select>
              <div><div style="float: left">Roundtrip</div> <v-checkbox v-model="roundtrip"></v-checkbox></div>
              <p v-if="showModal"></p>
              <div :class="{success: success, error: !success}" v-if="showModal" @close="showModal = false">{{ response }}</div>
          </v-card-text>
          <v-card-actions class="flex-column align-center"><v-btn v-on:click="send()">Create</v-btn></v-card-actions>
        </v-card>
    `,
    data() {
        return {
            options: {
                format: 'DD/MM/YYYY HH:mm:ss',
                useCurrent: true,
            },
            robot: "",
            farm: utils.agrifarm,
            to: "",
            from: "",
            robots: [],
            farms: [utils.agrifarm],
            froms: [],
            parcels: [],
            parcel: "",
            response: "",
            showModal: true,
            success: true,
            roundtrip: true,
            date: moment()
        }
    },
    methods: {
        send() {
            const data = {}
            data["timestamp"] = Math.round(parseFloat(moment(this.date).format('x')) / 1000)
            data["agrirobot_id"] = this.robot["id"]
            data["agrifarm_id"] = this.farm
            data["from_place_id"] = this.from
            data["agriparcel_id"] = this.parcel
            data["roundtrip_flag"] = "" + this.roundtrip
            const tis = this
            utils.plannerCreatePlan(data, function (res) {
                tis.showModal = true
                tis.success = true
                tis.response = "OK"
            }, function (err) {
                tis.showModal = true
                tis.success = false
                tis.response = "Error: " + err
            })
        },
    },
    mounted() {
        // get the agrifarm and its components
        axios.get(utils.orionurl + `entities/${utils.agrifarm}?options=keyValues`).then(agrifarm => {
            agrifarm = agrifarm.data
            this.froms = [].concat(agrifarm.hasAgriParcel, agrifarm.hasBuilding, agrifarm.hasRoadSegment)
            this.parcels = agrifarm.hasAgriParcel
            this.from = this.froms[0]
            this.parcel = this.parcels[0]
        })
        // get the agrirobots
        axios.get(utils.orionurl + `entities?type=AgriRobot&options=keyValues&limit=1000`).then(robots => {
            robots = robots.data
            robots.forEach(robot => {
                this.robots.push({"name": robot["name"], "id": robot["id"]})
            })
            this.robot = this.robots[0]
        })
    },
}
