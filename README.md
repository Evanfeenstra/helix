# helix broker

**Digital Twins on the IOTA Tangle using Masked Authenticated Messaging**

Helix is an MQTT broker that stores data in Masked Authenticated Message streams on the IOTA Tangle. It can be used to create online digital twins of physical assets in the real world. At [H2H](https://h2h.ai), we use it to create immutable records of data points coming from GPS trackers and other IoT devices. Records in Helix cannot be tampered with, meaning that data can be used in situations where reliablility and verifiability are required, such as insurance claims or asset custody records. The features of Helix are:

- Helix can run as a full MQTT broker, or as an MQTT client of another broker.
- Uses RabbitMQ queues to ensure that messages are posted to the tangle in the right order. If many messages are simultaneously received (like when a device comes back online after losing connectivity), Helix will post these messages to the correct stream in the order they were received.
- simple REST api, that we will be updating with more features soon.


### quick test

Run this `curl` to post a simple message to the Tangle!
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
You will see a response like this: `{"url":"https://mam.iota.studio?root=AKUERAJPZTWGHTPIZQXMKOAESVYVLQTTZBPSMAWVRVLTEHK9HJOVHASDGYJZBYTPX9NLUQNEGBTQRZZQN&sideKey=test&mode=restricted"}`. Copy the URL into your browser to view the MAM stream online!

### configuring helix

Helix can be configured with environment variables. If running locally, siply make a `.env` file and fill in the following values:
```
DATABASE_URL = ***

CLOUDAMQP_URL = ***

IOTA_PROVIDER = ***

MQTT_URL = ***
MQTT_USERNAME = ***
MQTT_PASSWORD = ***
MQTT_TOPICS = something/#

```

### running helix locally

- `git clone https://github.com/Evanfeenstra/helix`
- `cd helix`
- `yarn`
- `node index.js`

### deploying to heroku

- `heroku create your-broker-name`
- in the heroku web dashboard, provision Postgres DB and CloudAMQP
- run `heroku pg:psql` to enter the Postgres CLI, and run the script in streams.sql
- in psql also run `CREATE EXTENSION IF NOT EXISTS pgcrypto;`
- `heroku config:set IOTA_PROVIDER=https://dyn.tangle-nodes.com:443`
- `git push origin heroku`