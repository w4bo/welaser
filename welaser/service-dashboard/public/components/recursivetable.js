const recursivetable = {
    template: `
      <tr style="border: 1pt solid black; width:100%">
          <td style="border: 1px solid" v-if="k !== ''">{{ k }} </td>
          <td style="border: 1pt solid black; width:100%" v-if="typeof v !== 'object'">
              <img v-if="(typeof v === 'string' && v.startsWith('http') && (v.endsWith('.jpg') || v.endsWith('.png'))) || (k === 'imageSnapshot')" :src="v" width="100%" />
              <iframe v-else-if="k === 'streamURL' && v != ''" :src="v" width="100%" />  
              <div v-else v-html="display()"></div>
          </td>
          <recursivetable v-if="typeof v === 'object'" v-for="(value, key) in Object.keys(v).sort().reduce((obj, key) => { obj[key] = v[key]; return obj;}, {})" :v="typeof value === 'number'? ('' + value) : value" :k="key" :key="prevkey + '.' + key"></recursivetable>
      </tr>
    `,
    methods: {
        display() {
            // if (this.hideDetails && [
            //     "id", "timestamp_iota", "timestamp_subscription", "domain", "mission", "location",
            //     "actualLocation", "plannedLocation", "category", "cmdList", "weight", "heading",
            //     "hasFarm", "hasDevice", "hitch", "refRobotModel", "areaServed"
            // ].includes(this.label)) { /* do nothing */
            // } else {
            let value = this.v
            let key = this.k
            if (typeof value == 'string') value = value.trim().replace("%3D", "=")
            const base64regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/
            if (typeof value === 'string' && value.length > 100 && base64regex.test(value)) {
                return `<img src="data:image/png;base64,${value}" width="100%" alt="Broken image">`
            } else if (typeof key === 'string' && key.toLowerCase().includes('timestamp') && parseFloat(value) > 946681200) {
                // 946681200 = Fri Dec 31 1999 23:00:00 GMT+0000
                return utils.formatDateTime(value)
            }
            return value
        }
    },
    props: {
        'v': undefined,
        'k': undefined,
        'prevkey': String
    },  // , 'hideDetails'
    name: 'recursivetable'
}
