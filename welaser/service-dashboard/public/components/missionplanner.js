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
              From (place) <v-autocomplete :items="froms" item-text="name" item-value="id" v-model="from" style="padding: 0" dense>
                  <template v-slot:item="data"><autocompleteitem :data="data"></autocompleteitem></template>
              </v-autocomplete>
              Parcel <v-autocomplete :items="parcels" item-text="name" item-value="id"  v-model="parcel" style="padding: 0" dense>
                  <template v-slot:item="data"><autocompleteitem :data="data"></autocompleteitem></template>
              </v-autocomplete>
              <div><div style="float: left">Roundtrip</div> <v-checkbox v-model="roundtrip"></v-checkbox></div>
              <p v-if="showModal"></p>
              <div :class="{success: success, error: !success}" v-if="showModal" @close="showModal = false">{{ response }}</div>
          </v-card-text>
          <v-card-actions class="flex-column align-center"><v-btn v-on:click="send()" :disabled="!(robot && parcel && from)">Create</v-btn></v-card-actions>
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
            robots: [],
            froms: [],
            parcels: [],
            parcel: undefined,
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
            data["agrifarm_id"] = utils.agrifarm
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
        const tis = this
        function rec(l) {
            if (l.length === 0) {
                tis.froms = tis.froms.sort((a, b) => a.name > b.name)
                tis.from = tis.froms[0]
                tis.parcels = tis.parcels.sort((a, b) => a.name > b.name)
                tis.parcel = tis.parcels[0]
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
            this.robot = this.robots[0]
        })
    },
    components: {
        autocompleteitem: autocompleteitem
    }
}
