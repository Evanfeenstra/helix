const mosca = require('mosca')
const amqp = require('./amqp')
const {processor} = require('./utils')

var USERNAME = process.env.MQTT_USERNAME || 'username'
var PASSWORD = process.env.MQTT_PASSWORD || 'password'
// var SECURE_KEY = __dirname + '/../../test/secure/tls-key.pem';
// var SECURE_CERT = __dirname + '/../../test/secure/tls-cert.pem';

let pingInterval

var authenticate = function (client, username, password, callback) {
    if (username == USERNAME && password.toString() == PASSWORD)
        callback(null, true);
    else
        callback(null, false);
}

var authorizePublish = function (client, topic, payload, callback) {
    var auth = true;
    // set auth to :
    //  true to allow 
    //  false to deny and disconnect
    //  'ignore' to puback but not publish msg.
    callback(null, auth);
}

var authorizeSubscribe = function (client, topic, callback) {
    var auth = true;
    // set auth to :
    //  true to allow
    //  false to deny 
    callback(null, auth);
}

function start(moscaSetting, BROKER_DEBUG) {
  return new Promise(function(resolve, reject) {
    const broker = new mosca.Server(moscaSetting)

    broker.on('ready', () => {
        broker.authenticate = authenticate;
        broker.authorizePublish = authorizePublish;
        broker.authorizeSubscribe = authorizeSubscribe;
        pingInterval = setInterval(()=>{
            broker.publish({
                topic: `ping`,
                payload: JSON.stringify(true),
                qos: 0, // 0, 1, or 2
                retain: false // or true
            })
        }, 30000)
        resolve(broker)
    })
    
    broker.on("error", err => {
        if(pingInterval) clearInterval(pingInterval)
        reject(err)
    })

    broker.on('published', function (packet, client) {
        if(BROKER_DEBUG){
            console.log("=======Message=======");
            packet.topic && console.log("Topic :=", packet.topic);
            packet.payload && console.log("Payload :=", packet.payload.toString('utf8'));
            console.log("")
        }

        if (packet.topic.startsWith('$SYS')) return
        if (packet.topic.startsWith('streams')) return
        if (packet.topic.startsWith('ping')) return
        let m
        try {m = JSON.parse(packet.payload.toString('utf8'))}
        catch(e){}
        if (!m) return

        const msg = processor.makeId(m, packet.topic)
        amqp.publish(msg)
    });

    broker.pub = function(e) {
        //console.log("posted to stream",e)
        broker.publish({
            topic: `streams/${e.id}`,
            payload: JSON.stringify({
              root: e.root
            }), // or a Buffer
            qos: 0, // 0, 1, or 2
            retain: false // or true
        }, function() {
            //console.log('done!');
        });
    }

    // let this resolve anyway if mosca isnt properly set up
    setTimeout(()=> resolve(null), 5000)
  })
}

async function init() {
    const {MQTT_PORT, WS_PORT, BROKER_DEBUG} = process.env
    const mqtt_port = MQTT_PORT || 1883
    var moscaSetting = {
        interfaces: [
            { type: "mqtt", port: mqtt_port },
            // { type: "mqtts", port: 8883, credentials: { keyPath: SECURE_KEY, certPath: SECURE_CERT } },
            // { type: "http", port: parseInt(WS_PORT) || 80, bundle: true },
            // { type: "https", port: 3001, bundle: true, credentials: { keyPath: SECURE_KEY, certPath: SECURE_CERT } }
        ],
        stats: false,
        // persistence : {
        //     factory : mosca.persistence.Memory
        // }

        //onQoS2publish: 'noack', // can set to 'disconnect', or to 'dropToQoS1' if using a client which will eat puback for QOS 2; e.g. mqtt.js

        //logger: { name: 'MoscaServer', level: 'debug' },
    }

    try {
        const broker = await start(moscaSetting, BROKER_DEBUG)
        if(BROKER_DEBUG) broker_log(broker)
        if(broker){
            console.log('[mosca] init')
            return {broker:broker}
        }
        return null   
    } catch (e) {
        throw e
    }
}

function broker_log(broker){
    broker.on('clientConnected', function (client) {
        console.log("=======Connected=======");
        console.log(client.id);
        console.log("")
    });
    broker.on('subscribed', function (topic, client) {
        console.log("=======Subscribed=======");
        console.log(client.id);
        console.log("")
    });
    broker.on('unsubscribed', function (topic, client) {
        console.log("=======Connected=======");
        console.log(client.id, topic);
        console.log("")
    });
    broker.on('clientDisconnecting', function (client) {
        console.log('clientDisconnecting := ', client.id);
    });
    broker.on('clientDisconnected', function (client) {
        console.log("=======Disconnected=======");
        console.log(client.id);
        console.log("")
    });
}

module.exports = {init}