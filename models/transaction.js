const {Schema, model, Types} = require('mongoose')

const transactionSchema = new Schema({
  time: {type: Date, default: Date.now},
  amount: {type: Number, required: true},
  description: {type: String},
  user_id: { type: Types.ObjectId, ref: 'User' }
})

const Transaction = model('Transaction', transactionSchema)

module.exports = Transaction
