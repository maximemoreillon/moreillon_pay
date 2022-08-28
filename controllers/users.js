const bcrypt = require('bcrypt')
const MongoDB = require('mongodb')

const db_config = require('../db_config.js')

const MongoClient = MongoDB.MongoClient;
const ObjectID = MongoDB.ObjectID;


exports.create_user = (req, res) => {

  // input sanitation
  if(!req.body.card_uuid) return res.status(400).send('missing card_uuid')
  if(!req.body.username) return res.status(400).send('missing username')
  if(!req.body.password) return res.status(400).send('missing password')

  bcrypt.hash(req.body.password, 10, (err, hash) => {
    if(err) return res.status(500).send(`Error hashing password: ${err}`)

    MongoClient.connect(db_config.url, db_config.options, (err, db) => {
      if(err) {
        console.log(`Error connecting to DB: ${err}`)
        return res.status(500).send(`Error connecting to DB: ${err}`)
      }

      var user_decord = {
        username: req.body.username,
        card_uuid : req.body.card_uuid,

        password_hashed : hash,

        display_name : req.body.username, // by default display name is username
        balance : 0, // Start with empty account
      }

      db.db(db_config.db)
      .collection(db_config.user_collection)
      .insertOne(user_decord, (err, result) => {

        // Error handling
        if (err) {
          console.log(`Error creating user: ${err}`)
          return res.status(500).send(`DB error: ${err}`)
        }

        res.send(result)

        require('../main.js').io.sockets.emit('user_created',result.ops[0])

        db.close()
      })
    })
  })
}

exports.delete_user = (req,res) => {
  // input sanitation
  if(!req.query.user_id) return res.status(400).send('missing user_id')

  MongoClient.connect(db_config.url, db_config.options, (err, db) => {

    if(err) {
      console.log(`Error connecting to DB: ${err}`)
      return res.status(500).send(`Error connecting to DB: ${err}`)
    }

    db.db(db_config.db)
    .collection(db_config.user_collection)
    .deleteOne({_id: ObjectID(req.query.user_id)}, (err, result) => {

      // Error handling
      if (err) {
        console.log(`Error getting user: ${err}`)
        return res.status(500).send(`Error getting user: ${err}`)
      }

      res.send('OK')

      require('../main.js').io.sockets.emit('user_deleted', {_id: req.query.user_id})

      db.close()
    })
  })
}

exports.update_card_uuid = (req,res) => {
  // input sanitation
  if(!req.body.user_id) return res.status(400).send('missing user_id')
  if(!req.body.card_uuid) return res.status(400).send('missing card_uuid')

  MongoClient.connect(db_config.url, db_config.options, (err, db) => {

    if(err) {
      console.log(`Error connecting to DB: ${err}`)
      return res.status(500).send(`Error connecting to DB: ${err}`)
    }

    db.db(db_config.db)
    .collection(db_config.user_collection)
    .findOneAndUpdate(
      { _id: ObjectID(req.body.user_id) },
      { $set: {card_uuid: req.body.card_uuid} },
      { returnOriginal: false },
      (err, result) => {

      // Error handling
      if (err) {
        console.log(`Error getting user: ${err}`)
        return res.status(500).send(`Error getting user: ${err}`)
      }

      res.send(result.value)
      
      require('../main.js').io.sockets.emit('user_updated', result.value)

      db.close()
    })
  })
}

exports.update_display_name = (req,res) => {
  // input sanitation
  if(!req.body.user_id) return res.status(400).send('missing user_id')
  if(!req.body.display_name) return res.status(400).send('missing display_name')
}

exports.update_admin_rights = (req,res) => {
  // input sanitation
  if(!req.body.user_id) return res.status(400).send('missing user_id')
  if(!('admin' in req.body)) return res.status(400).send('missing admin')

  MongoClient.connect(db_config.url, db_config.options, (err, db) => {

    if(err) {
      console.log(`Error connecting to DB: ${err}`)
      return res.status(500).send(`Error connecting to DB: ${err}`)
    }

    db.db(db_config.db)
    .collection(db_config.user_collection)
    .findOneAndUpdate(
      {_id: ObjectID(req.body.user_id)},
      {$set: {admin: req.body.admin}},
      { returnOriginal: false },
      (err, result) => {

      // Error handling
      if (err) {
        console.log(`Error getting user: ${err}`)
        return res.status(500).send(`Error getting user: ${err}`)
      }

      res.send(result.value)

      require('../main.js').io.sockets.emit('user_updated', result.value)

      db.close()
    })
  })

}

exports.get_all_users = (req,res) => {

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

      res.send(result)
      db.close()
    })
  })
}

exports.get_user = (req,res) => {
  // input sanitation
  if(!req.query.user_id) return res.status(400).send('missing user_id')

  MongoClient.connect(db_config.url, db_config.options, (err, db) => {

    if(err) {
      console.log(`Error connecting to DB: ${err}`)
      return res.status(500).send(`Error connecting to DB: ${err}`)
    }

    db.db(db_config.db)
    .collection(db_config.user_collection)
    .findOne({_id: ObjectID(req.query.user_id)}, (err, result) => {

      // Error handling
      if (err) {
        console.log(`Error getting user: ${err}`)
        return res.status(500).send(`Error getting user: ${err}`)
      }

      res.send(result)
      db.close()
    })
  })
}
