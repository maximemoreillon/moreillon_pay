const bcrypt = require('bcrypt')
const createHttpError = require('http-errors')
const { get_db } = require('../db.js')
const { ObjectID } = require('mongodb')
const db_config = require('../db_config')

exports.create_user = (req, res) => {

  // input sanitation
  // TODO: use JOI
  if (!req.body.card_uuid) throw createHttpError(400, 'missing card_uuid') 
  if (!req.body.username) throw createHttpError(400, 'missing username')
  if (!req.body.password) throw createHttpError(400, 'missing password')

  bcrypt.hash(req.body.password, 10, (err, hash) => {
    if(err) return res.status(500).send(`Error hashing password: ${err}`)

    const user_decord = {
      username: req.body.username,
      card_uuid : req.body.card_uuid,

      password_hashed : hash,

      display_name : req.body.username, // by default display name is username
      balance : 0, // Start with empty account
    }

    const db = get_db()

    db.collection(db_config.user_collection)
    .insertOne(user_decord, (err, result) => {

      // Error handling
      if (err) throw createHttpError(500, err) 

      res.send(result.ops[0])

      require('../main.js').io.sockets.emit('user_created',result.ops[0])

    })
  })
}

exports.get_all_users = (req, res) => {

  const db = get_db()

  db.collection(db_config.user_collection)
    .find({})
    .toArray((err, result) => {

      if (err) throw createHttpError(500, err)

      res.send(result)
    })
}

exports.get_user = (req, res) => {

  const user_id = req.params.user_id || req.query.user_id

  if (!user_id) throw createHttpError(400, 'missing user_id')

  const db = get_db()


  db.collection(db_config.user_collection)
    .findOne({ _id: ObjectID(user_id) }, (err, result) => {
      if (err) throw createHttpError(500, err)
      if (!result) throw createHttpError(404, `User ${user_id} not found`)
      res.send(result)
    })
}

exports.delete_user = (req,res) => {

  const user_id = req.params.user_id || req.query.user_id

  if (!user_id) throw createHttpError(400, 'missing user_id')

  const db = get_db()


  db.collection(db_config.user_collection)
    .deleteOne({ _id: ObjectID(user_id)}, (err, result) => {

    // Error handling
    if (err) throw createHttpError(500, err) 

    res.send('OK')

    require('../main.js').io.sockets.emit('user_deleted', { _id: user_id })

  })
}

exports.update_card_uuid = (req,res) => {
  // input sanitation
  if (!req.body.user_id) throw createHttpError(400, 'missing user_id')
  if(!req.body.card_uuid) return res.status(400).send('missing card_uuid')



  const db = get_db()

  db.collection(db_config.user_collection)
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

  })
}



exports.update_admin_rights = (req,res) => {
  // input sanitation
  if (!req.body.user_id) throw createHttpError(400, 'missing user_id')
  if(!('admin' in req.body)) return res.status(400).send('missing admin')

  const db = get_db()

  db.collection(db_config.user_collection)
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

  })

}


