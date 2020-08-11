const MongoDB = require('mongodb')

const db_config = require('./db_config.js')

const MongoClient = MongoDB.MongoClient;
const ObjectID = MongoDB.ObjectID;

exports.transaction = (req, res) => {
  // API to perform a transaction


  // Input sanitation
  if(!('transaction_amount' in req.body)) {
    console.log("[HTTP] Missing amount");
    return res.status(400).send({status: "Missing amount"})
  }

  if(!('transaction_description' in req.body)) {
    console.log("[HTTP] Missing description");
    return res.status(400).send({status: "Missing description"})
  }

  // Important: Ensure transaction amount is a number
  const transaction_amount = Number(req.body.transaction_amount)

  // Check if the query can be formed

  let card_uuid = req.body.card_uid || req.body.card_uuid
  let user_id = req.body.user_id

  let query = {}

  if(card_uuid) query = {card_uuid: card_uuid}
  else if(user_id) query._id = ObjectID(req.body.user_id)
  else return res.status(400).send({status: "Missing card UUID or user ID"})


  MongoClient.connect(db_config.url, db_config.options, (err, db) => {

    // handle DB errors
    if (err) {
      console.log(`Error connecting to DB: ${err}`)
      return res.status(500).send({status: "DB conn error"})
    }

    var dbo = db.db(db_config.db)

    // If transaction is negative (payment and not top up), make sure the account has at least
    if(transaction_amount < 0) query.balance = {$gte: -transaction_amount}

    dbo.collection(db_config.user_collection)
    .findOneAndUpdate(
      query, // Query
      { $inc: {balance: transaction_amount} }, // Action
      { returnOriginal: false }, // Options
      (err, transaction_result) => {

        // handle DB errors
        if (err) {
          console.log(`Error operating transaction in DB: ${err}`)
          return res.status(500).send({status: "DB error"})
        }

        // Check if collection has been modified or not (i.e. found a match)
        if(transaction_result.value === null){
          console.log("[HTTP] Invalid transaction request")
          return res.status(404).send({status : "Invalid"})
        }

        // Composing log entry
        var log_entry = {
          timestamp : new Date(),
          user_id : transaction_result.value._id,
          new_balance : transaction_result.value.balance,
          transaction_amount : transaction_amount,
          transaction_description : req.body.transaction_description,
        };


        // Log everything in the transaction log
        dbo.collection(db_config.log_collection)
        .insertOne(log_entry, (err, result) => {
          if (err) {
            console.log(`Error Logging transaaction: ${err}`)
            return res.status(500).send({status: "DB error"})
          }

          db.close();

          console.log("[HTTP] Valid transaction");

          res.send({
            status: 'OK',
            employee_number: transaction_result.value.employee_number,
            balance:  transaction_result.value.balance,
            transaction_amount: transaction_amount,
          });

          // Update clients connected through websockets
          require('./main.js').io.sockets.emit('user_updated', transaction_result.value)

        });

      } // Closing of callback function for first mongoDB operation callback
    );
  }); // End of MongoDB connect

}
