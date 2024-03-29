const createHttpError = require("http-errors")
const { hash_password } = require("../auth.js")
const dotenv = require("dotenv")
const User = require("../models/user")
dotenv.config()

const { ADMIN_PASSWORD = "keyboardcat" } = process.env

exports.create_user = async (req, res) => {
  const { card_uuid, username, password } = req.body

  if (!card_uuid) throw createHttpError(400, "missing card_uuid")
  if (!username) throw createHttpError(400, "missing username")
  if (!password) throw createHttpError(400, "missing password")

  const password_hashed = await hash_password(password)

  const newUser = await User.create({
    username,
    password_hashed,
    card_uuid,
    display_name: username,
  })

  console.log(`[Mongoose] User ${newUser._id} created`)
  require("../index.js").io.sockets.emit("user_created", newUser)

  res.send(newUser)
}

exports.read_users = async (req, res) => {
  const users = await User.find({})
  res.send(users)
}

exports.read_user = async (req, res) => {
  const { user: currentUser } = res.locals
  let { user_id } = req.params

  if (user_id === "self" && currentUser) user_id = currentUser._id
  else throw createHttpError(400, "Using self but not logged in")
  const user = await User.findById(user_id)
  if (!user) throw createHttpError(404, `User ${user_id} not found`)
  res.send(user)
}

exports.update_user = async (req, res) => {
  const { user_id } = req.params
  const properties = req.body
  const options = { new: true }
  const user = await User.findByIdAndUpdate(user_id, properties, options)
  if (!user) throw createHttpError(404, `User ${user_id} not found`)
  res.send(user)
}

exports.update_user_password = async (req, res) => {
  // TODO: check current password
  const { user_id } = req.params
  const { newPassword, currentPassword } = req.body
  const { user: currentUser } = res.locals
  const options = { new: true }
  if (!currentUser.isAdmin && currentUser._id !== user_id)
    throw createHttpError(403, `Not allowed to modify another user's password`)
  const password_hashed = await hash_password(newPassword)
  const user = await User.findByIdAndUpdate(
    user_id,
    { password_hashed },
    options
  )
  if (!user) throw createHttpError(404, `User ${user_id} not found`)
  res.send(user)
}

exports.delete_user = async (req, res) => {
  const { user_id } = req.params
  const user = await User.findByIdAndDelete(user_id)
  if (!user) throw createHttpError(404, `User ${user_id} not found`)
  res.send(user)
  require("../index.js").io.sockets.emit("user_deleted", { _id: user._id })
}

exports.create_admin_account = async () => {
  const password_hashed = await hash_password(ADMIN_PASSWORD)
  const userProperties = {
    username: "admin",
    display_name: "Administrator",
    password_hashed,
    isAdmin: true,
  }
  await User.create(userProperties)
  console.log(`Administrator account created`)
}
