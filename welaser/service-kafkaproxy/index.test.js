const env = require('dotenv')
env.config() // load the environment variables
const io = require('socket.io-client')
const waitForExpect = require('wait-for-expect')
const timeout = 120000
waitForExpect.defaults.timeout = timeout
const sleep = ms => new Promise(r => setTimeout(r, ms));

test('I should be able to send/receive a message through Kafka', () => {
    const url = 'http://137.204.74.56:12345'
    // const url = 'http://' + process.env.PROXY_IP + ":" + process.env.PROXY_SERVER_PORT_EXT
    console.log(url)
    const socket = io.connect(url)
    let i = 0
    socket.on('foo', function (socket) { // this is topic is published by the ETL service
        console.log("Received")
        i += 1
    })
    socket.emit('newtopic', 'foo')
    socket.emit('publish', {topic: 'foo', data: {'bar': 'foobar'}})
    return waitForExpect(() => {
        expect(i).toBeGreaterThan(0)
        socket.disconnect()
    });
}, timeout)