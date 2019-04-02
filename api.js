const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const helmet = require('helmet')
const amqp = require('./amqp')
const mam = require("./mam")
const { trytesToAscii } = require('@iota/converter')
const {processor} = require("./utils");
const http = require('http')
const db = require('./db')

const JWT_SECRET = process.env.JWT_SECRET || 'secret'

async function init(r) {

  const API_PORT = process.env.PORT

  let broker;
  r.forEach(service=>{
    if(service && service.broker){
      broker = service.broker
    }
  })

  const app = express()
  app.use(helmet())
  app.use(cors())
  app.use(bodyParser.json())
  app.use(bodyParser.urlencoded({ extended: true }))
  app.disable('x-powered-by')

  app.post('/stream/:id', async (req, res, next) => {
    console.log('/stream')
    const m = processor.makeId(req.body, req.url)
    console.log(m)
    amqp.publish(m)
    return res.status(200).json({posted:true})
  })

  app.get('/stream/:id', async (req,res) => {
    console.log('GET /stream/' + req.params.id)
    const r = await db.getStreamById(req.params.id)
    console.log(r)
    if(r.rowCount){
      const stream = r.rows[0]
      const root = stream.last_root
      const sideKey = JSON.parse(trytesToAscii(stream.side_key))
      url = `https://mam.iota.studio?root=${root}&sideKey=${sideKey}&mode=restricted`
      return res.status(200).json({url})
    }
    return res.status(400).json({error:"Not Found"})
  })

  app.post('/message', async (req, res, next) => {
    console.log('/message')
    if (!req.body.root) return res.status(400).json('no root')
    console.log('/message',req.body)

    let m
    try {
      m = await mam.get(req.body.root, req.body.mode, req.body.sideKey)
    } catch(e) {
      console.error(e)
      return res.status(400).json({error:"Not Found"})
    }
    console.log(m)
    return res.status(200).json(m)
  })

  app.get('/ping', (req,res) => {
    return res.status(200).json('pong')
  })

  try{
    const success = await listen(app, broker, API_PORT)
    console.log(success)
  } catch(e){
    console.log(e)
  }
}

function listen(app, broker, API_PORT) {
  return new Promise(function(resolve, reject) {
    const port = API_PORT || 5001
    const server = http.createServer(app)
    if(broker){
      broker.attachHttpServer(server)
    }
    server.listen(parseInt(port), function() {
      resolve("[API] port " + port)
    })
  })
}

module.exports = {init}


