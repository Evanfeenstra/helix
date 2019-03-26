const crypto = require('crypto')

const keyGen = length => {
    var charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ9'
    var values = crypto.randomBytes(length)
    var result = new Array(length)
    for (var i = 0; i < length; i++) {
        result[i] = charset[values[i] % charset.length]
    }
    return result.join('')
}

function Processor(){
  this.ID_PROP = process.env.ID_PROP
  this.ID_VALUES = process.env.ID_VALUES
  this.ID_TYPE = process.env.ID_TYPE
}

Processor.prototype.makeId = function(m, path){

  // if the message already has an "id", just return
  if(m.id) return m

  const accept_values = this.ID_VALUES && this.ID_VALUES.split(' ')
  if(this.ID_PROP){
    if(m[this.ID_PROP]){
      if(accept_values){
        if(accept_values.find(v => v.toString() === m[this.ID_PROP].toString())){
          return { ...m, id: this.typer(m[this.ID_PROP])}
        } else return null// skip if values not present
      } 
    } else return null// skip if prop not present
  } else {
    // get id from path
    const a = path && path.split('/')
    if(a && a.length && a[a.length-1]){
      return { ...m, id: this.typer(a[a.length-1]) }
    }
  }

  return m
}

Processor.prototype.typer = function(v){
  if(!this.ID_TYPE) return v
  switch (this.ID_TYPE) {
    case 'string':
      return v.toString()
    case 'number':
      return parseInt(v)
    default:
      return v
  }
}

const processor = new Processor()

module.exports = {keyGen, processor}