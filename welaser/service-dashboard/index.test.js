const env = require('dotenv')
const timelimit = 100000
env.config()

test('test roundtrip', async () => {
    const topic = "test.dashboard"
    const remoteSocket = require('socket.io-client')(`http://${process.env.PROXY_IP}:${process.env.PROXY_PORT_EXT}`)
    let c = 0
    remoteSocket.on(topic, _ => c++) // register a subscriber to the kafka proxy
    remoteSocket.emit("newtopic", topic) // notify the KafkaProxy to subscribe to a Kafka topic
    const retry = 10
    for (let i = 0; i < retry && c === 0; i++) { // ... publish on the same topic (i.e., KafkaProxy sends a message on Kafka)
        await new Promise((r) => setTimeout(r, (timelimit * 0.98) / retry)) // ... wait
        remoteSocket.emit("publish", {topic: topic, data: {}})
    }
    expect(c).toBeGreaterThan(0) // some message should have been received on the same topic
}, timelimit)