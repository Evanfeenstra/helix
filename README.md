# helix broker

**Digital Twins on the IOTA Tangle using Masked Authenticated Messaging**

Helix is an MQTT broker that stores data in Masked Authenticated Message streams on the IOTA Tangle. It can be used to create online digital twins of physical assets in the real world. We use Helix at [H2H](http://h2h.ai) to create immutable data streams from GPS trackers and other IoT devices. Records in Helix cannot be tampered with, meaning that data can be used in situations where reliablility and verifiability are required, such as insurance claims or tracing asset custody.

- Helix can run as a full MQTT broker, or as an MQTT client of another broker.
- Uses RabbitMQ queues to ensure that messages are posted to the tangle in the right order. If many messages are simultaneously received (like when a device comes back online after losing connectivity), Helix will post these messages to the correct stream in the order they were received.
- Simple REST api, that we will be updating with more features soon.
- The Postgres DB only stores MAM information (root, side_key, index, etc). The actual data that you post to Helix is stored 100% on the Tangle.

![helix broker](https://github.com/Evanfeenstra/helix/blob/master/helix-broker.png)

### configuring helix

Helix can be configured with environment variables. If running locally, simply make a `.env` file and fill in the following values:
```
DATABASE_URL = ***

CLOUDAMQP_URL = ***

IOTA_PROVIDER = ***

# optional global side_key
SIDE_KEY = ***

# key for postgres pgcrypto
PG_KEY = *** 

# username/password for embedded MQTT broker
MQTT_USERNAME = ***
MQTT_PASSWORD = ***

# these are optional, for connecting to a separate MQTT broker
MQTT_URL = ***
MQTT_TOPICS = something/#
```

### running helix locally

- `git clone https://github.com/Evanfeenstra/helix`
- `cd helix`
- `yarn`
- In your Postgres instance, install `pgcrypto` and run the script in [streams.sql](https://github.com/Evanfeenstra/helix/blob/master/streams.sql)
- `node index.js`

### deploying to heroku

You can run Helix on Heroku for free! Heroku also has add-ons for Postgres and CloudAMQP. Once you provision these, Heroku will add those automatically to your environment. Unfortunately Heroku does not support direct TCP routing that is required to host Helix as an MQTT broker... instead, you can configure the `MQTT_URL`, `MQTT_USERNAME`, and `MQTT_PASSWORD` env variables to make Helix act as an MQTT client to another broker like Mosquitto. This is what we do at H2H, which allows us to handle device authentication separately from Helix.

- `heroku create your-broker-name`
- in the heroku web dashboard, provision Postgres DB and CloudAMQP
- run `heroku pg:psql` to enter the Postgres CLI, and run the script in [streams.sql](https://github.com/Evanfeenstra/helix/blob/master/streams.sql)
- in psql also run `CREATE EXTENSION IF NOT EXISTS pgcrypto;`
- `heroku config:set IOTA_PROVIDER=https://dyn.tangle-nodes.com:443`
- `git push origin heroku`

### quick test

Helix is running live on the IOTA mainnet right now. Run this `curl` to post a simple message to the Tangle!
```bash
curl --header "Content-Type: application/json" \
  --request POST \
  --data '{"test":123}' \
  https://helix-broker.herokuapp.com/stream/test 
```
Then after 5-10 seconds, run the following to get the MAM root
```bash
curl https://helix-broker.herokuapp.com/stream/test 
```
The response will contain a URL like this: [https://mam.iota.studio?root=AKUERAJPZTWGHTPIZQXMKOAESVYVLQTTZBPSMAWVRVLTEHK9HJOVHASDGYJZBYTPX9NLUQNEGBTQRZZQN&sideKey=test&mode=restricted](https://mam.iota.studio?root=AKUERAJPZTWGHTPIZQXMKOAESVYVLQTTZBPSMAWVRVLTEHK9HJOVHASDGYJZBYTPX9NLUQNEGBTQRZZQN&sideKey=test&mode=restricted). Copy the URL into your browser to view the MAM stream online!