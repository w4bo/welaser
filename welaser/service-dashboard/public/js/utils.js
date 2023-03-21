const utils = {}

utils.dataTimeOptions = {
    format: 'DD/MM/YYYY HH:mm:ss',
    useCurrent: false,
}

utils.getTopic = function (topic = config.DRACO_RAW_TOPIC + "." + utils.agrifarm) {
    return topic.replaceAll(/[-:_]/g, "")
}

utils.kafkaProxyNewTopic = function (remoteSocket, newtopic, handleStreamData, prevTopic = undefined) {
    if (prevTopic) remoteSocket.removeAllListeners(prevTopic) // remove previous listeners
    const socketName = utils.getTopic(newtopic) // clean the topic name
    remoteSocket.emit("newtopic", socketName) // notify the new topic to Kakfa proxy
    remoteSocket.on(socketName, data => { // listen to the new topic
        handleStreamData(JSON.parse(data))
    })
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

utils.builderCreateMap = function (data, then, error) {
    axios
        .post(utils.builderurl, data)
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
    if (v === "Camera") return utils.colors[5]
    return utils.colors[utils.hashCode(v) % utils.colors.length]
}

utils.renderRows = function(data, hideDetails) {
    let html = `<table style="border-collapse: collapse; width:100%; margin-left: auto; margin-right: auto">`
    for (let [key, value] of Object.entries(data)) {
        if (hideDetails && [
            "id", "timestamp_iota", "timestamp_subscription", "domain", "mission", "location",
            "actualLocation", "plannedLocation", "category", "cmdList", "weight", "heading",
            "hasFarm", "hasDevice", "hitch", "refRobotModel", "areaServed"
        ].includes(key)) { /* do nothing */ } else {
            html += `<tr style="border: 1pt solid black; width:100%"><td style="border: 1pt solid black">${key}</td><td style="border: 1pt solid black; width:100%">`
            if (typeof value === "object") {
                html += utils.renderRows(value, hideDetails)
            } else {
                if (typeof value == 'string') {
                    try { value = decodeURI(value.trim()) } catch (e) {}
                }
                const base64regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/
                if (value !== "") {
                    if (typeof value === 'string' && value.length > 100 && base64regex.test(value)) {
                        html += `<img src="data:image/png;base64,${value}" width="100%" alt="Broken image: ${value}">`
                    } else if (typeof value === 'string' && value.startsWith("http") && (value.endsWith(".jpg") || value.endsWith(".png"))) {
                        html += `<img src="${value}" width="100%" alt="Broken image: ${value}">`
                    } else if (key === 'streamURL') {
                        html += `<iframe src="${value}" width="100%"></iframe>`
                    } else if (key.toLowerCase().includes('timestamp') && parseFloat(value) > 946681200) {
                        // 946681200 = Fri Dec 31 1999 23:00:00 GMT+0000
                        html += utils.formatDateTime(value)
                    } else {
                        html += value
                    }
                }
            }
            html += `</td></tr>`
            html = html
                .replaceAll("<table style=\"border-collapse: collapse; width:100%; margin-left: auto; margin-right: auto\"></table>", "")
                .replaceAll("<td></td>", "")
        }
    }
    return html + `</table>`
}

utils.sendCommand = function (deviceId, command, payload = {}) {
    const inner = {}
    inner[command] = payload
    axios
        .patch(
            utils.orionurl + `entities/${deviceId}/attrs?options=keyValues`,
            {"cmd": inner},
            {headers: utils.jsonheaders}
        )
        .then(response => {console.log(response)})
        .catch(err => {console.log(err)})
}

utils.getName = function (obj) {
    let ret = undefined;
    ["name", "cameraName", "id"].forEach(function (key) {
        if (typeof ret === "undefined" && obj[key]) {
            ret = obj[key]
        }
    })
    return ret
}

utils.getDevices = function (tis, type, acc, then) {
    axios
        .get(utils.orionurl + `entities?type=${type}&options=keyValues&limit=1000`)
        .then(devices => {
            devices = devices.data
            devices.forEach(function (device, index) {
                if (device["domain"] === utils.agrifarm || device["areaServed"] === utils.agrifarm) {
                    tis.$set(acc, device.id, {'data': device, 'color': utils.getRandomColor(device.type)})
                }
            })
            if (then) then(acc)
        })
}

utils.formatDateTime = function (timestampMs, includeDate = true, includeTime = true) {
    const date = new Date(parseInt(timestampMs));
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
    let d = year + "-" + month.substr(-2) + "-" + day.substr(-2)
    let t = hours + ':' + minutes.substr(-2) + ':' + seconds.substr(-2)
    if (includeDate) t = " " + t
    return (includeDate ? d : "") + (includeTime ? t : "")
}

utils.downloadJSON = function (json, name="download") {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(json))
    const downloadAnchorNode = document.createElement('a')
    downloadAnchorNode.setAttribute("href", dataStr)
    downloadAnchorNode.setAttribute("download", name + ".json")
    document.body.appendChild(downloadAnchorNode)
    downloadAnchorNode.click()
    downloadAnchorNode.remove()
}

utils.uuidv4 = function () {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    )
}
utils.agrifarm = "urn:ngsi-ld:AgriFarm:6991ac61-8db8-4a32-8fef-c462e2369055"
utils.nodeurl = `http://${config.WEB_SERVER_IP}:${config.WEB_SERVER_PORT_EXT}`
utils.orionurl = `http://${config.ORION_IP}:${config.ORION_PORT_EXT}/v2/`
utils.plannerurl = `http://${config.PLANNER_IP}:${config.PLANNER_PORT_EXT}/data`
utils.builderurl = `http://${config.BUILDER_IP}:${config.BUILDER_PORT_EXT}/data`
utils.proxyurl = `http://${config.PROXY_IP}:${config.PROXY_PORT_EXT}`
utils.jsonheaders = {'Content-Type': 'application/json'}
utils.chartresolution = 5000
utils.charthistorylength = 25
utils.colors = d3.schemeTableau10
utils.mapcenter = [40.3128, -3.482]
utils.selectedbytype = {}
utils.missionguitypes = [
    {name: 'AgriRobot', exclusive: true},
    {name: 'Camera', exclusive: false, max: 4},
    // {name: 'AgriParcel', exclusive: true},
    // {name: 'Device', exclusive: false}
]