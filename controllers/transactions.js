const MongoDB = require('mongodb')
const createHttpError = require('http-errors')
const { get_db } = require('../db.js')

const db_config = require('../db_config.js')

const { ObjectID } = MongoDB;

exports.registerTransaction = (req, res, next) => {
  // API to perform a transaction


  // Input sanitation
  if (!('transaction_amount' in req.body)) throw createHttpError(400,'Missing amount')
  if (!('transaction_description' in req.body)) throw createHttpError(400, 'Missing description')

  // Important: Ensure transaction amount is a number
  const transaction_amount = Number(req.body.transaction_amount)

  // Check if the query can be formed

  let card_uuid = req.body.card_uid || req.body.card_uuid
  let user_id = req.body.user_id

  let query = {}

  if(card_uuid) query = {card_uuid: card_uuid}
  else if(user_id) query._id = ObjectID(req.body.user_id)
  else throw createHttpError(400, 'Missing card UUID or user ID') 



  var dbo = get_db()

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
      const log_entry = {
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

        console.log("[HTTP] Valid transaction");

        res.send({
          status: 'OK',
          employee_number: transaction_result.value.employee_number,
          balance:  transaction_result.value.balance,
          transaction_amount: transaction_amount,
        });

        // Update clients connected through websockets
        require('../main.js').io.sockets.emit('user_updated', transaction_result.value)

      });

    }
  );

}
