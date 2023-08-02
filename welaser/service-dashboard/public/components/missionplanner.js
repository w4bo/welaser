const missionplanner = {
    template: `
        <v-card>
          <v-card-title class="pb-0">Create mission plan</v-card-title>
          <v-card-text>
              Date <date-picker v-model="date" :config="options"/></v-col>
              Robot
                  <v-autocomplete item-text="name" item-value="id" :items="robots" v-model="robot" style="padding: 0" dense>
                      <template v-slot:item="data"><autocompleteitem :data="data"></autocompleteitem></template>
                  </v-autocomplete>
              From (place)
                  <v-autocomplete :items="froms" item-text="name" item-value="id" v-model="from" style="padding: 0" dense>
                      <template v-slot:item="data"><autocompleteitem :data="data"></autocompleteitem></template>
                  </v-autocomplete>
              Parcel 
                  <v-autocomplete :items="parcels" item-text="name" item-value="id"  v-model="parcel" style="padding: 0" dense>
                      <template v-slot:item="data"><autocompleteitem :data="data"></autocompleteitem></template>
                  </v-autocomplete>
              <div style="display: flex">
                  <v-checkbox class="p-3" v-model="roundtrip" label="Roundtrip"></v-checkbox>
                  <v-checkbox class="p-3" v-model="alllines" label="All lines"></v-checkbox>
                  <v-text-field class="p-3" style="width: 80px" v-if="!alllines" v-model="lines" type="number" min="1" max="100" density="compact" hide-details variant="outlined" label="Max lines"></v-text-field>
                  <v-text-field class="p-3" style="width: 80px" v-model="initialline" type="number" min="1" max="100" density="compact" hide-details variant="outlined" label="Initial line"></v-text-field>
                  <v-text-field class="p-3" style="width: 80px" v-model="jumps" type="number" min="1" max="100" density="compact" hide-details variant="outlined" label="Jumps"></v-text-field>
              </div>
              <div :class="{success: success, error: !success}" v-if="showModal" @close="showModal = false">{{ response }}</div>
              <img v-if="showModal" :src="'data:image/png;base64,' + image" width="100%" :alt="image">
          </v-card-text>
          <v-card-actions class="flex-column align-center"><v-btn v-on:click="send()" :disabled="!(parcel && from)">Create</v-btn></v-card-actions>
        </v-card>
    `,
    data() {
        return {
            options: {
                format: 'DD/MM/YYYY HH:mm:ss',
                useCurrent: true,
            },
            robot: undefined,
            from: undefined,
            alllines: true,
            lines: 1,
            initialline: 1,
            jumps: 3,
            to: "",
            robots: [],
            froms: [],
            parcels: [],
            parcel: undefined,
            response: "",
            image: "",
            showModal: true,
            success: true,
            roundtrip: true,
            date: moment()
        }
    },
    methods: {
        send() {
            this.showModal = false
            const data = {}
            data["timestamp"] = Math.round(parseFloat(moment(this.date).format('x')) / 1000)
            data["agrirobot_id"] = this.robot
            data["agrifarm_id"] = utils.agrifarm
            data["from_place_id"] = this.from
            data["agriparcel_id"] = this.parcel
            data["roundtrip_flag"] = "" + this.roundtrip
            data["lines"] = this.alllines? "All": parseInt(this.lines)
            data["jumps"] = parseInt(this.jumps)
            data["initialline"] = parseInt(this.initialline)
            const tis = this
            utils.plannerCreatePlan(data, function (res) {
                tis.showModal = true
                tis.success = true
                tis.response = res.data.info
                tis.image = res.data.img.replace(/%3D/g, "=")
            }, function (err) {
                tis.showModal = true
                tis.success = false
                tis.response = err.response.data? err.response.data.info: "Error"
                tis.image = ""
            })
        },
    },
    mounted() {
        const tis = this
        function rec(l) {
            if (l.length === 0) {
                tis.froms = tis.froms.sort((a, b) => a.name > b.name)
                tis.from = tis.froms[0]["id"]
                tis.parcels = tis.parcels.sort((a, b) => a.name > b.name)
                tis.parcel = tis.parcels[0]["id"]
            } else {
                const type = l.pop()
                utils.getDevices(tis, type, {}, function (acc) {
                    Object.values(acc).forEach(function (entity) {
                        if (type === "AgriParcel") {
                            tis.parcels.push(entity.data)
                        }
                        tis.froms.push(entity.data)
                    })
                    rec(l)
                })
            }
        }
        rec(["AgriParcel", "Building", "RoadSegment"])
        // get the agrirobots
        axios.get(utils.orionurl + `entities?type=AgriRobot&options=keyValues&limit=1000`).then(robots => {
            robots = robots.data
            robots.forEach(robot => {
                this.robots.push({"name": robot["name"], "id": robot["id"]})
            })
            this.robot = this.robots[0]? this.robots[0]["id"] : ""
        })
    },
    components: {
        autocompleteitem: autocompleteitem
    }
}
