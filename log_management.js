const MongoDB = require('mongodb')

const db_config = require('./db_config.js')

const MongoClient = MongoDB.MongoClient
const ObjectID = MongoDB.ObjectID


exports.get_log = (req,res) => {

  var query = {};

  // Filter by transaction type
  if(!req.query.categories) return res.status(404).send(`Categories not specified`)

  query['$or'] = req.query.categories.map(category => {
    return {transaction_description: category}
  })

  // Filter by transaction date
  if(req.query.start_date && req.query.end_date) {
    query.timestamp = {
      $gte: new Date(req.query.start_date),
      $lte: new Date(req.query.end_date)
    }
  }


  MongoClient.connect(db_config.url, db_config.options, (err, db) => {

    if(err) {
      console.log(`Error connecting to DB: ${err}`)
      return res.status(500).send(`Error connecting to DB: ${err}`)
    }

    db.db(db_config.db)
    .collection(db_config.log_collection)
    .aggregate([
      { $match: query },
      { $lookup:
         {
           from: db_config.user_collection,
           localField: 'user_id',
           foreignField: '_id',
           as: 'user'
         }
       }
    ])
    .toArray((err, result) => {

      // Error handling
      if (err) {
        console.log(`Error getting log: ${err}`)
        return res.status(500).send(`Error getting log: ${err}`)
      }

      res.send(result)
      db.close()
    })
  })
}

exports.clear_log = (req,res) => {

  MongoClient.connect(db_config.url, db_config.options, (err, db) => {

    if(err) {
      console.log(`Error connecting to DB: ${err}`)
      return res.status(500).send(`Error connecting to DB: ${err}`)
    }

    db.db(db_config.db)
    .collection(db_config.log_collection)
    .drop((err, delOK) => {
      if (err) {
        console.log(`Error deleting log: ${err}`)
        return res.status(500).send(`Error deleting log: ${err}`)
      }

      if (delOK) {
        console.log("Log deleted")
        res.send("Log deleted")
      }
      db.close();
    });
  })
}

exports.distinct_descriptions = (req,res) => {

  MongoClient.connect(db_config.url, db_config.options, (err, db) => {

    if(err) {
      console.log(`Error connecting to DB: ${err}`)
      return res.status(500).send(`Error connecting to DB: ${err}`)
    }

    db.db(db_config.db)
    .collection(db_config.log_collection)
    .distinct('transaction_description', (err, result) => {

      // Error handling
      if (err) {
        console.log(`Error getting log: ${err}`)
        return res.status(500).send(`Error getting log: ${err}`)
      }

      res.send(result)
      db.close()
    })

  })
}
