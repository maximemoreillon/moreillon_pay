const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const MongoDB = require('mongodb')
const dotenv = require('dotenv')

const db_config = require('./db_config.js')

dotenv.config()

const MongoClient = MongoDB.MongoClient;
const ObjectID = MongoDB.ObjectID;


exports.login = (req, res) => {

  // Input sanitation
  if(!req.body.username) return res.status(400).send('missing username')
  if(!req.body.password) return res.status(400).send('missing password')

  MongoClient.connect(db_config.url, db_config.options, (err, db) => {

    if(err) {
      console.log(`Error connecting to DB: ${err}`)
      return res.status(500).send(`Error connecting to DB: ${err}`)
    }

    db.db(db_config.db)
    .collection(db_config.user_collection)
    .findOne({username: req.body.username}, (err, user) => {

      // error handling
      if(err) return res.status(500).send(`Error querying the DB: ${err}`)

      // close the database
      db.close()

      bcrypt.compare(req.body.password, user.password_hashed, (err, result) => {
        // Handle hashing errors
        if(err) return res.status(500).send(`Error while verifying password for user ${user.username}: ${err}`)

        // Check validity of result
        if(!result) return res.status(403).send(`Incorrect password for user ${user.username}`)

        // Generate JWT
        jwt.sign({ user_id: user._id }, process.env.JWT_SECRET, (err, jwt) => {

          // handle signing errors
          if(err) return res.status(500).send(`Error while generating token for user ${user.username}: ${err}`)

          // Respond with JWT
          res.send({
            user: user,
            jwt: jwt
          });

        })
      })
    })
  })
}


exports.admin_only = (req, res, next) => {
  // Check if authorization header set
  if(!req.headers.authorization) return res.status(403).send('Authorization header not set')
  // parse the headers to get the token
  let token = req.headers.authorization.split(" ")[1];
  if(!token) return res.status(403).send('Token not found in authorization header')

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if(err) return res.status(403).send('Invalid JWT')

    MongoClient.connect(db_config.url, db_config.options, (err, db) => {

      if(err) {
        console.log(`Error connecting to DB: ${err}`)
        return res.status(500).send(`Error connecting to DB: ${err}`)
      }

      db.db(db_config.db)
      .collection(db_config.user_collection)
      .findOne({_id: ObjectID(decoded.user_id)}, (err, result) => {

        // Error handling
        if (err) {
          console.log(`Error getting user: ${err}`)
          return res.status(500).send(`Error getting user: ${err}`)
        }

        db.close()

        if(result.admin) next()
        else res.status(403).send('User must be an administrator')

      })
    })
  })
}

exports.transaction_auth = (req, res, next) => {
  // admin or specific device
  
  // Check if authorization header set
  if(!req.headers.authorization) return res.status(403).send('Authorization header not set')
  // parse the headers to get the token
  let token = req.headers.authorization.split(" ")[1];
  if(!token) return res.status(403).send('Token not found in authorization header')

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if(err) return res.status(403).send('Invalid JWT')

    // if transaction operated by a device, simply allow
    if(decoded.device) return next()

    MongoClient.connect(db_config.url, db_config.options, (err, db) => {

      if(err) {
        console.log(`Error connecting to DB: ${err}`)
        return res.status(500).send(`Error connecting to DB: ${err}`)
      }

      db.db(db_config.db)
      .collection(db_config.user_collection)
      .findOne({_id: ObjectID(decoded.user_id)}, (err, result) => {

        // Error handling
        if (err) {
          console.log(`Error getting user: ${err}`)
          return res.status(500).send(`Error getting user: ${err}`)
        }

        db.close()

        if(result.admin) next()
        else res.status(403).send('User must be an administrator')

      })
    })
  })
}


function decode_jwt_respond_with_user(token, res){
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if(err) return res.status(403).send('Invalid JWT')

    MongoClient.connect(db_config.url, db_config.options, (err, db) => {

      if(err) {
        console.log(`Error connecting to DB: ${err}`)
        return res.status(500).send(`Error connecting to DB: ${err}`)
      }

      db.db(db_config.db)
      .collection(db_config.user_collection)
      .findOne({_id: ObjectID(decoded.user_id)}, (err, result) => {

        // Error handling
        if (err) {
          console.log(`Error getting user: ${err}`)
          return res.status(500).send(`Error getting user: ${err}`)
        }

        res.send(result)
        db.close()
      })
    })
  })
}

exports.whoami = (req, res) => {
  // Check if authorization header set
  if(!req.headers.authorization) return res.status(403).send('Authorization header not set')
  // parse the headers to get the token
  let token = req.headers.authorization.split(" ")[1];
  if(!token) return res.status(403).send('Token not found in authorization header')

  decode_jwt_respond_with_user(token, res)


}

exports.get_user_from_jwt = (req, res) => {
  // Check if authorization header set
  if(!req.query.jwt) return res.status(403).send('JWT not present in query')
  decode_jwt_respond_with_user(req.query, res)
}

exports.device_jwt = (req, res) => {
  // Generate JWT
  jwt.sign({ device: true }, process.env.JWT_SECRET, (err, jwt) => {

    // handle signing errors
    if(err) return res.status(500).send(`Error while generating token: ${err}`)

    // Respond with JWT
    res.send(jwt)

  })
}
