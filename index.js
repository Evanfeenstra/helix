require ('newrelic');
require('dotenv').config()
const amqp = require('./amqp')
const db = require('./db')
const iota = require('./iota')
const mqtt = require('./mqtt')
const api = require('./api')
const broker = require('./broker')
const mam = require('./mam')

async function main() {

  try{
    
    const r = await Promise.all([
      amqp.connect(),
      db.connect(),
      mqtt.connect(),
      broker.init(),
    ])
    await mam.init(r)
    await api.init(r)

  } catch(e) {
    console.error(e)
    process.kill(process.pid,'SIGTERM')
  }

  // console.log("TEST")
  // mam.postMam('test',{hi:'hi'},'sideKey')

  console.log("===== READY =====")
}

main()

/*

heroku config:set ASDF=asdf

heroku ps:scale web=0
heroku ps:scale web=1

*/




