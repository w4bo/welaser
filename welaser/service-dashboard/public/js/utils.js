const utils = {}

utils.renderJSON = function (data, hideDetails, enableEdit) {
    if (typeof (data) != "object") {
        if (typeof (data) == "string") {
            return data.trim()
        }
    } else {
        return renderRows(data, hideDetails, enableEdit)
    }
}

utils.getTopic = function (agrifarm = utils.agrifarm) {
    return config.DRACO_RAW_TOPIC + "." + agrifarm.replaceAll(/[-:_]/g, "")
}

utils.plannerCreatePlan = function (data, then, error) {
    axios
        .post(utils.plannerurl, data)
        .then(result => {
            if (then) then(result)
        }).catch(err => {
        if (error) error(err)
    })
}

utils.hashCode = function (s) {
    if (s) {
        let h;
        for (let i = 0; i < s.length; i++) {
            h = Math.imul(31, h) + s.charCodeAt(i) | 1;
        }
        return Math.abs(h);
    } else {
        return 0
    }
}

utils.fiwareUpdateEntity = function (data, then, error) {
    axios
        .post(utils.orionurl + `op/update?options=keyValues`, {'actionType': 'append', 'entities': [data]}, utils.jsonheaders)
        .then(result => {
            if (then) then(result)
        }).catch(err => {
        if (error) error(err)
    })
}

utils.fiwareCreateEntity = function (data, then, error) {
    axios
        .post(utils.orionurl + `entities?options=keyValues`, data, utils.jsonheaders)
        .then(result => {
            if (then) then(result)
        }).catch(err => {
        if (error) error(err)
    })
}

utils.round = function (v, mult) {
    return new Date(Math.round(v / mult) * mult).toLocaleString()
}

utils.getRandomColor = function (v) {
    return utils.colors[utils.hashCode(v) % utils.colors.length]
}

utils.renderRows = function(data, hideDetails, enableEdit) {
    let html = `<table style="border-collapse: collapse; width:100%; margin-left: auto; margin-right: auto">`
    for (let [key, value] of Object.entries(data)) {
        key = key.trim()
        if (typeof value == 'string') value = value.trim().replaceAll("%3D", "=")
        if (hideDetails && [
            "id", "timestamp_iota", "timestamp_subscription", "domain", "mission", "location",
            "actualLocation", "plannedLocation", "category", "cmdList", "weight", "heading",
            "hasFarm", "hasDevice", "hitch", "refRobotModel", "areaServed"
        ].includes(key)) {
            // do nothing
        } else {
            const base64regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
            let th = `<th style="border: 1pt solid black">${key}</th>`
            if (Array.isArray(data)) { th = "" }
            html += `<tr style="border: 1pt solid black; width:100%">${th}<td>`
            if (typeof value == 'string' && value.length > 100 && base64regex.test(value)) {
                html += `<img src="data:image/png;base64,${value}" style="width:20vh" alt="Broken image: ${value}">`
            } else if (key === 'timestamp') {
                const date = new Date(parseInt(value));
                // Hours part from the timestamp
                const year = date.getFullYear();
                // Minutes part from the timestamp
                const month = "0" + date.getMonth();
                // Seconds part from the timestamp
                const day = "0" + date.getDay();
                // Hours part from the timestamp
                const hours = date.getHours();
                // Minutes part from the timestamp
                const minutes = "0" + date.getMinutes();
                // Seconds part from the timestamp
                const seconds = "0" + date.getSeconds();
                const formattedTime = year + "-" + month.substr(-2) + "-" + day.substr(-2) + " " + hours + ':' + minutes.substr(-2) + ':' + seconds.substr(-2);
                html += renderJSON(formattedTime, hideDetails, enableEdit)
            } else if (value !== "") {
                html += renderJSON(value, hideDetails, enableEdit)
            }
            html += `</td></tr>`
            html = html
                .replaceAll("<table style=\"border-collapse: collapse; width:100%; margin-left: auto; margin-right: auto\"></table>", "")
                .replaceAll("<td></td>", "")
        }
    }
    return html + `</table>`
}

utils.uuidv4 = function () {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    )
}
utils.agrifarm = "urn:ngsi-ld:AgriFarm:6991ac61-8db8-4a32-8fef-c462e2369055"
utils.nodeurl = `http://${config.IP}:${config.WEB_SERVER_PORT_EXT}`
utils.orionurl = `http://${config.ORION_IP}:${config.ORION_PORT_EXT}/v2/`
utils.plannerurl = `http://${config.PLANNER_IP}:${config.PLANNER_PORT_EXT}`
utils.proxyurl = `http://${config.PROXY_IP}:${config.PROXY_PORT_EXT}`
utils.jsonheaders = {'Content-Type': 'application/json'}
utils.chartresolution = 5000
utils.charthistorylength = 25
utils.colors = d3.schemeTableau10