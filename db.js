const { Client, Pool } = require('pg')
const moment = require('moment')

const PG_KEY = process.env.PG_KEY || 'aes_key_'

let pool
async function connect(){
  const db_url = process.env.DATABASE_URL
  console.log(db_url)
  if(!db_url) throw new Error('Missing DATABASE_URL in env')

  pool = new Pool({
    connectionString: db_url,
    ssl: true,
  })

  try {
    const success = await testConnection()
    console.log(success)
  } catch(e) {
    throw e
  }
}

function testConnection() {
  return new Promise(function(resolve, reject) {
    pool.connect((err, client, release) => {
      if (err) reject(err)
      resolve('[DB] connected')
    })
  })
}

module.exports = {

  getStreamRoot: async (id) => pool.query(`SELECT last_root, index from streams WHERE id=$`,[id]),

  getStreamById: async (id) => pool.query(`SELECT * from streams WHERE id=$1`,
    [id]),

  // auto-unlock if a minute has passed (need to check the mam stream maybe?)
  // there may or may not be a message in the stream
  getStreamByIdAndLock: async (id) => {
    await pool.query(`BEGIN;`)
    // FOR UPDATE locks the transaction
    const r = await pool.query(`SELECT *, 
      PGP_SYM_DECRYPT(seed::bytea, 'aes_key_') as seed 
      FROM streams WHERE id=$1 FOR UPDATE;`,
    [id])
    let locked = 'TRUE'
    let last_locked = 'now()' // first time
    const savedLocked = r.rows && r.rows[0] && r.rows[0].locked
    const lastTime = r.rows && r.rows[0] && r.rows[0].last_locked
    if(savedLocked){
      // already locked... check it out
      const lastTimeVal = moment(lastTime).utc().format('YYYY-MM-DD HH:mm:ss')
      const ago = moment.utc().subtract(60, 'seconds').format('YYYY-MM-DD HH:mm:ss')
      if(Date.parse(lastTimeVal) < Date.parse(ago)){
        // a minute has passed... there must have been an error. unlock
        locked = 'FALSE'
      } else {
        // keep the channel locked
        last_locked = lastTime
      }
    }
    await pool.query(`UPDATE streams SET locked=$2, last_locked=$3 WHERE id=$1;`,[id,locked,last_locked])
    await pool.query(`COMMIT;`)
    return r
  },

  createNewStream: async (s) => pool.query(`
    INSERT INTO streams(id,first_root,last_root,next_root,seed,side_key,start,locked)
    VALUES($2,$3,$4,$5,PGP_SYM_ENCRYPT($6,$1),$7,$8,FALSE)
    ON CONFLICT DO NOTHING`, 
  [PG_KEY,s.id,s.first_root,s.last_root,s.next_root,s.seed,s.side_key,s.start]),

  updateStreamMamState: async (s) => pool.query(`
    UPDATE streams SET 
    last_root=$1, next_root=$2, start=$3, locked=FALSE WHERE id=$4 returning streams
    `,[s.last_root, s.next_root, s.start, s.id]),

  unlockStream: async (id) => pool.query(`UPDATE streams SET locked=FALSE WHERE id=$1`, [id]),

  connect

}
