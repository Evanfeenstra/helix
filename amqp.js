var amqp = require("amqplib/callback_api");
var retry = require("amqplib-retry");
const mam = require("./mam");
const db = require("./db");

const CONSUMER_QUEUE = "jobs";
const FAILURE_QUEUE = "retry";

const SEC = 3;

// set to true and run to delete queue (testing)
const CLEAR_ALL = false;

const processMsg = async msg => {
  let m;
  try {
    m = JSON.parse(msg.content.toString());
  } catch (e) {
    console.log("NOT JSON");
    throw e;
  }
  if(!(m && m.id)) return // skip if no ID

  try {
    await mam.postMam(m.id, m)
  } catch(e) {
    console.log("ERROR HERE",e)
    // if there is some weird error, unlock it to try again
    if(e!=='mam_channel_locked'){
      db.unlockStream(m.id)
    }
    throw e
  }
  //await timeout(10000)
  //console.log('ok')
};

let client;

async function connect() {
  const cloudamqp_url = process.env.CLOUDAMQP_URL
  if(!cloudamqp_url) throw new Error('Missing CLOUDAMQP_URL in env')

  return new Promise((resolve, reject) => {
    amqp.connect(cloudamqp_url + '?heartbeat=60', (err,conn) => {
      if (err) return reject(err)
      conn.on('error', (err) => {
        if (err.message !== 'Connection closing') {
          console.error("[AMQP] conn error", err.message)
          return reject(err)
        }
      })
      conn.on('close', () => {
        console.error('[AMQP] reconnecting');
        setTimeout(()=>connect(cloudamqp_url), 1000)
      })
      whenConnected(conn)
      console.log('[AMQP] connected')
      return resolve()
    });
  })
}

function whenConnected(conn) {
  client = conn
  startPublisher();
  startWorker();
}

var pubChannel = null;
var offlinePubQueue = [];
function startPublisher() {
  client.createConfirmChannel(function(err, ch) {
    if (closeOnErr(err)) return;
    ch.on("error", function(err) {
      console.error("[AMQP] channel error", err.message);
    });
    ch.on("close", function() {
      console.log("[AMQP] channel closed");
    });

    pubChannel = ch;
    while (true) {
      var m = offlinePubQueue.shift();
      if (!m) break;
      publish(m[0], m[1], m[2]);
    }
  });
}

function publish(content, exchange, routingKey = CONSUMER_QUEUE) {
  try {
    pubChannel.publish(
      exchange,
      routingKey,
      content,
      { persistent: true },
      function(err, ok) {
        if (err) {
          console.error("[AMQP] publish", err);
          // save them for later publishing if goes offline
          offlinePubQueue.push([content, exchange, routingKey]);
          pubChannel.connection.close();
        }
      }
    );
  } catch (e) {
    console.error("[AMQP] publish", e.message);
    offlinePubQueue.push([content, exchange, routingKey]);
  }
}

// A worker that acks messages only if processed succesfully
function startWorker() {
  client.createChannel(function(err, ch) {
    if (closeOnErr(err)) return;
    ch.on("error", function(err) {
      console.error("[AMQP] channel error", err.message);
    });

    ch.on("close", function() {
      console.log("[AMQP] channel closed");
    });

    ch.prefetch(10);
    if (CLEAR_ALL) {
      ch.deleteQueue(FAILURE_QUEUE, function(err, ok) {
        if (err) {
          return console.log(err);
        }
        console.log("DELETED", ok);
      });
      ch.deleteQueue(CONSUMER_QUEUE, function(err, ok) {
        if (err) {
          return console.log(err);
        }
        console.log("DELETED", ok);
      });
    } else {
      //console.log(ch)
      ch.assertQueue(FAILURE_QUEUE, { durable: true, autoDelete: true });
      ch.assertQueue(
        CONSUMER_QUEUE,
        { durable: true, autoDelete: true },
        function(err, _ok) {
          if (closeOnErr(err)) return;
          //ch.consume(CONSUMER_QUEUE, processMsg, { noAck: false });
          ch.consume(
            CONSUMER_QUEUE,
            retry({
              channel: ch,
              consumerQueue: CONSUMER_QUEUE,
              failureQueue: FAILURE_QUEUE,
              handler: processMsg,
              delay: attempts => SEC * 1000
            })
          );
        }
      );
    }
  });
}

const timeout = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function closeOnErr(err) {
  if (!err) return false;
  console.error("[AMQP] error", err);
  client.close();
  return true;
}

// var i = 0;
// const limit = 1;
// setInterval(function() {
//   if(i>=limit) i=1
//   else i++
//   publish(new Buffer(JSON.stringify({body:"work work work",id:i})), "", CONSUMER_QUEUE);
// }, SEC*1000);

function blockConsoleErrors(strings) {
  function intercept(method) {
    var original = console[method];
    console[method] = function() {
      var args = Array.prototype.slice.call(arguments);
      // block this error message if contained in any of the Error stack
      if (args && strings.find(s => args.some(a=>{
        const msg = a instanceof Error ? a.message : a
        //console.log(msg)
        return msg&&msg.includes(s)
      }))) {
        return;
      }
      original.apply(console, arguments);
    };
  }
  var methods = ["error"];
  for (var i = 0; i < methods.length; i++) intercept(methods[i]);
}
//blockConsoleErrors(["mam_channel_locked"]);

module.exports = { connect, publish };
