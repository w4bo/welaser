const missionplanner = {
    template: `
        <v-card>
          <v-card-title class="pb-0">Create mission plan</v-card-title>
          <v-card-text>
              Robot <v-select item-text="name" item-value="id" :items="robots" v-model="robot" style="padding: 0" dense></v-select>
              Farm <v-select :items="farms" v-model="farm" style="padding: 0" dense></v-select>
              From (place) <v-select :items="froms" v-model="from" style="padding: 0" dense></v-select>
              To (place) <v-select :items="froms" v-model="to" style="padding: 0" dense></v-select>
          </v-card-text>
          <v-card-actions class="flex-column align-center"><v-btn v-on:click="create(robot, farm, from, to)">Create</v-btn></v-card-actions>
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
        }
    },
    methods: {
        send(agrifarm, robot, from, to) {
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
            this.to = this.froms[1] | this.froms[0]
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
