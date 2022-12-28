const {Schema, model} = require('mongoose')

const userSchema = new Schema({
  username: {type: String, unique: true, trim: true, required: true},
  password_hashed: { type: String, required: true, select: false },
  balance: { type: Number, default: 0 },
  card_uuid: String,
  display_name: String,
  isAdmin: Boolean,
})

const User = model('User', userSchema)

module.exports = User
