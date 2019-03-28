const { asciiToTrytes, trytesToAscii } = require('@iota/converter')

const toTrytes = (a) => asciiToTrytes(JSON.stringify(a))
const fromTrytes = (a) => JSON.parse(trytesToAscii(a))

module.exports = { toTrytes, fromTrytes }

