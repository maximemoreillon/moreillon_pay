const Transaction = require("../models/transaction")
const User = require("../models/user")

const createHttpError = require("http-errors")

exports.create_transaction = async (req, res) => {
  const { user: currentUser } = res.locals

  const { card_uuid, user_id, amount, description } = req.body

  // TODO: consider case where top up from admin

  const query =
    currentUser && currentUser.isAdmin
      ? { $or: [{ card_uuid }, { _id: user_id }] }
      : { card_uuid }

  const user = await User.findOne(query)

  if (!user) throw createHttpError(404, `User with card ${card_uuid} not found`)
  if (user.balance < Number(amount))
    throw createHttpError(400, `Insufficient balance`)

  user.balance += Number(amount)

  await user.save()

  const newTransactionProperties = {
    user_id: user._id,
    amount,
    description,
  }

  const newTransaction = await Transaction.create(newTransactionProperties)
  console.log(`Transaction ${newTransaction._id} registered`)

  // TODO: Improve require
  require("../index.js").io.sockets.emit("user_updated", user)

  res.send(newTransaction)
}

exports.read_transactions = async (req, res) => {
  // TODO: apply filters
  const { from, to, ...query } = req.query

  const transactions = await Transaction.find({})

  console.log(`Transactions queried`)
  res.send(transactions)
}
