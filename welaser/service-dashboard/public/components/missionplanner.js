const missionplanner = {
    template: `
        <v-card>
          <v-card-title class="pb-0">Create mission plan</v-card-title>
          <v-card-text>
              Robot <v-select item-text="name" item-value="id" :items="robots" v-model="robot" style="padding: 0" dense></v-select>
              Farm <v-select :items="farms" v-model="farm" style="padding: 0" dense></v-select>
              From (place) <v-select :items="froms" v-model="from" style="padding: 0" dense></v-select>
              To (place) <v-select :items="froms" v-model="to" style="padding: 0" dense></v-select>
              <p v-if="showModal"></p>
              <div :class="{success: success, error: !success}" v-if="showModal" @close="showModal = false">{{ response }}</div>
          </v-card-text>
          <v-card-actions class="flex-column align-center"><v-btn v-on:click="send(robot, farm, from, to)">Create</v-btn></v-card-actions>
        </v-card>
    `,
    data() {
        return {
            robot: "",
            farm: utils.agrifarm,
            to: "",
            from: "",
            robots: [],
            farms: [utils.agrifarm],
            froms: [],
            response: "",
            showModal: true,
            success: true
        }
    },
    methods: {
        send(robot, agrifarm, from, to) {
            const data = {}
            data["robotid"] = robot
            data["agrifarmid"] = agrifarm
            data["fromid"] = from
            data["toid"] = to
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
        axios.get(utils.orion_url + `entities/${utils.agrifarm}?options=keyValues`).then(agrifarm => {
            agrifarm = agrifarm.data
            this.froms = agrifarm.hasAgriParcel
            this.froms.push(agrifarm.hasBuilding)
            this.froms.push(agrifarm.hasRestrictedArea)
            this.froms.push(agrifarm.hasRoad)
            this.from = this.froms[0]
            if (this.froms[1]) {
                this.to = this.froms[1]
            } else {
                this.to = this.froms[0]
            }
        })
        // get the agrirobots
        axios.get(utils.orion_url + `entities?type=AgriRobot&options=keyValues&limit=1000`).then(robots => {
            robots = robots.data
            robots.forEach(robot => {
                this.robots.push({"name": robot["name"], "id": robot["id"]})
            })
            this.robot = this.robots[0]
        })
    },
}
