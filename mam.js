const Mam = require("./powsrvio/mam.client.js")
const remoteATT = require('./powsrvio/powsrv.js')
const { asciiToTrytes, trytesToAscii } = require('@iota/converter')
const db = require("./db")
const {keyGen} = require('./utils')

const toTrytes = (a) => asciiToTrytes(JSON.stringify(a))
const fromTrytes = (a) => JSON.parse(trytesToAscii(a))

function MAM(){
  this.side_key  = process.env.SIDE_KEY || 'test'
}

MAM.prototype.init = function(r) {

  const provider = process.env.IOTA_PROVIDER
  if(!provider) throw new Error('Missing IOTA_PROVIDER in env')

  this.mamState = Mam.init({
    provider:provider,
    attachToTangle: remoteATT(5000, null)
  })
  r && r.length && r.forEach(service => {
    if(service && service.broker){
      this.broker = service.broker
    }
    if(service && service.mqttClient){
      this.mqttClient = service.mqttClient
    }
  })
  console.log('[MAM] ready')
}

MAM.prototype.get = async function(rooot, mode, sk) {
  let sideKey
  if(sk) sideKey = toTrytes(sk)
    
  console.log("REAL SIDE KEY",sideKey)
  try {
    const m = await Mam.fetchSingle(rooot, mode, sideKey)
    return {
      data: fromTrytes(m.payload),
      next_root: m.nextRoot
    }
  } catch(e) {
    throw e
  }
}

MAM.prototype.postMam = async function(streamId, msg, sk) {

  const r = await db.getStreamByIdAndLock(streamId);
  let mamState;
  let device;
  let sideKey = sk || this.side_key

  const isFirst = !r.rowCount;
  if (isFirst) {
    // the first one does not lock...
    // just overwrites....
    mamState = newMamState(keyGen(81), toTrytes(sideKey)) // restricted
  } else {
    device = r.rows[0];
    if (device.locked) {
      throw 'mam_channel_locked' // this error blocked from logs
    }
    mamState = fillMamState(
      device.seed,
      device.side_key,
      device.start,
      device.next_root
    );
  }

  // console.log("==========")
  // console.log(mamState)

  let message
  try {
    message = Mam.create(mamState, toTrytes(JSON.stringify(msg)));
  } catch(e) {
    throw 'Could not create message  ' + e.message
  }

  //console.log("CREATE MESSAGE",message)

  // Attach the payload.
  console.log("ATTACHING TO TANGLE................",streamId,mamState.channel.start)
  try {
    const attached = await Mam.attach(message.payload, message.address, 3, 14);
    //console.log(attached)
    if(!attached){
      console.log("ERROR ATTACHING")
      throw "Error attaching message  " + attached.message
    }
  } catch(e) {
    console.log("NOT ATTACHED",e)
    throw "Message not attached  " + e.message
  }

  // update the mam state  
  try {
    // create OR update and unlock
    if (isFirst) {
      console.log('IS FIRST stream',streamId)
      await db.createNewStream({
        id: streamId,
        first_root: message.root,
        last_root: message.root,
        next_root: message.state.channel.next_root,
        seed: message.state.seed,
        side_key: message.state.channel.side_key,
        start: message.state.channel.start,
      })
    } else {
      const r = await db.updateStreamMamState({
        id: streamId,
        last_root: message.root,
        next_root: message.state.channel.next_root,
        start: message.state.channel.start,
      })
    }
  } catch(e) {
    throw 'Stream not created/updated  ' + e.message
  }

  console.log("LAST ROOT:", message.root);

  if(this.broker){
    this.broker.pub({
      id: streamId,
      root: message.root,
      start: message.state.channel.start,
      next_root: message.state.channel.next_root,
      payload: JSON.stringify(msg)
    })
  }

  if(this.mqttClient){
    this.mqttClient.publish(`stream-posted/${streamId}`, JSON.stringify({
      id: streamId,
      root: message.root,
      start: message.state.channel.start,
      next_root: message.state.channel.next_root,
      payload: msg
    }))
  }

  return message.root;
}

function* fibonacciUntil(max) {
  let current = 3;
  let next = 5;
  while (current <= max) {
    yield current;
    [current, next] = [next, current + next];
  }
}

const newMamState = (seed, side_key) => {
  var channel = {
    side_key,
    mode: "restricted",
    next_root: null,
    security: 2,
    start: 0,
    count: 1,
    next_count: 1,
    index: 0
  };
  return {
    subscribed: [],
    channel: channel,
    seed: seed
  };
};

const fillMamState = (seed, side_key, start, next_root) => {
  var channel = {
    side_key,
    mode: "restricted",
    next_root,
    security: 2,
    start,
    count: 1,
    next_count: 1,
    index: 0
  };
  return {
    subscribed: [],
    channel: channel,
    seed
  };
};

module.exports = new MAM()

