curl --header "Content-Type: application/json" \
  --request POST \
  --data '{"test":123}' \
  localhost:5000/stream/asdf 

curl localhost:5000/stream/asdf 
  
curl --header "Content-Type: application/json" \
  --request POST \
  --data '{"test":123}' \
  https://helix-broker.herokuapp.com/stream/asdf 



### running helix locally

- `git clone https://github.com/Evanfeenstra/helix`
- `cd helix`
- `yarn`
- `node index.js`

### deploying

- `heroku create your-broker-name`
- in the heroku web dashboard, provision a Postgres DB, CloudAMQP, and New Relic
- run `heroku pg:psql` to enter the Postgres CLI, and run the script in streams.sql
- also `CREATE EXTENSION IF NOT EXISTS pgcrypto;`
- `heroku config:set IOTA_PROVIDER=https://dyn.tangle-nodes.com:443`