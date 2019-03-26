const IOTA = require('iota.lib.js')
const usePowSrvIO = require('iota.lib.js.powsrvio')
const crypto = require('crypto')

// https://testnet140.tangle.works
// https://iotanode.us:443
// https://peanut.iotasalad.org:14265
// https://field.deviota.com:443
let iota
async function connect(){
    const provider = process.env.IOTA_PROVIDER
    if(!provider) throw new Error('Missing IOTA_PROVIDER in env')

    try {
        iota = await init(provider)
        usePowSrvIO(iota, 5000, null)
        console.log('[IOTA] connected')
        return {iota:iota}
    } catch(e) {
        console.log(e)
        throw e
    } 
}

const toTrytes = (a) => iota.utils.toTrytes(JSON.stringify(a))
const fromTrytes = (a) => JSON.parse(iota.utils.fromTrytes(a))

function init(provider) {
  return new Promise(function(resolve, reject) {
    iota = new IOTA({ provider })
    iota.api.getNodeInfo(function(error, success) {
        if (error) reject(error)
        resolve(iota);
    })
  })
}

module.exports = { connect, toTrytes, fromTrytes }

