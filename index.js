require ('newrelic');
require('dotenv').config()
const amqp = require('./amqp')
const db = require('./db')
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
    await api.init(r)
    await mam.init(r)

  } catch(e) {
    console.log("ERROR =========")
    console.error(e)
    process.kill(process.pid,'SIGTERM')
  }

  console.log("===== READY =====")
}

main()

/*

heroku config:set ASDF=asdf

heroku ps:scale web=0
heroku ps:scale web=1

*/




