// Importing packages
const { MongoClient } = require('mongodb')
const cors = require('cors')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')

// local packages
const db_config = require('./db_config.js')
const user_management = require('./controllers/users.js')
const transaction_management = require('./controllers/transactions.js')
const log_management = require('./controllers/logs.js')

const auth = require('./auth.js')


const port = 7342

// Set Timezone
process.env.TZ = 'Asia/Tokyo'

const app = express()
const http_server = http.Server(app)
const io = socketio(http_server)
exports.io = io


app.use(cors())
app.use(express.json());

app.get('/', (req, res) => { res.send('MoreillonPay API') })

// NOT RESTFUL
// Users related routes
app.get('/all_users', user_management.get_all_users)
app.get('/user', user_management.get_user)
app.post('/create_user', auth.admin_only, user_management.create_user)
app.post('/update_admin_rights', auth.admin_only, user_management.update_admin_rights)
app.post('/update_card_uuid', auth.admin_only, user_management.update_card_uuid)
app.delete('/user', auth.admin_only, user_management.delete_user)

// Authentication related routes
app.post('/login', auth.login)
app.post('/whoami', auth.whoami)
app.get('/device_jwt', auth.admin_only, auth.device_jwt)

// logs related routes
app.get('/log', log_management.get_log)
app.get('/distinct_descriptions', log_management.distinct_descriptions)

app.delete('/log', auth.admin_only, log_management.clear_log)


// Transactions related routes
app.post('/transaction', auth.transaction_auth, transaction_management.registerTransaction)


http_server.listen(port, () => {
  console.log(`[HTTP] MoreillonPay listening on *:${port}`);
});




io.sockets.on('connection', (socket) => {
  // Deals with Websocket connections
  console.log('[WS] User connected')

  MongoClient.connect(db_config.url, db_config.options, (err, db) => {

    if(err) {
      console.log(`Error connecting to DB: ${err}`)
      return res.status(500).send(`Error connecting to DB: ${err}`)
    }

    db.db(db_config.db)
    .collection(db_config.user_collection)
    .find({})
    .toArray((err, result) => {

      // Error handling
      if (err) {
        console.log(`Error getting users: ${err}`)
        return res.status(500).send(`Error getting users: ${err}`)
      }

      socket.emit('user_list', result)
      db.close()
    })
  })

  socket.on('disconnect', () => {
    console.log('[WS] user disconnected');
  })

})
