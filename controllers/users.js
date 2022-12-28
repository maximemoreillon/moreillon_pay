const createHttpError = require('http-errors')
const { hash_password } = require('../auth.js')
const dotenv = require('dotenv')
const User = require('../models/user')
dotenv.config()

const {
  ADMIN_PASSWORD = 'keyboardcat',
} = process.env

exports.create_user = async (req, res, next) => {

  const {
    card_uuid,
    username,
    password,
  } = req.body

  try {

    if (!card_uuid) throw createHttpError(400, 'missing card_uuid') 
    if (!username) throw createHttpError(400, 'missing username')
    if (!password) throw createHttpError(400, 'missing password')

    const password_hashed = await hash_password(password)

    const newUser = await User.create({
      username,
      password_hashed,
      card_uuid,
      display_name: username,
    })

    console.log(`[Mongoose] User ${newUser._id} created`)
    require('../index.js').io.sockets.emit('user_created', newUser)

    res.send(newUser)


  } catch (error) {
    next(error)
  }

}

exports.read_users = async (req, res, next) => {

  try {
    const users = await User.find({})
    res.send(users)
  } catch (error) {
    next(error)
  }

}

exports.read_user = async (req, res, next) => {

  const { user: currentUser } = res.locals
  let { user_id } = req.params
  
  try {
    if (user_id === 'self' && currentUser) user_id = currentUser._id
    else throw createHttpError(400, 'Using self but not logged in')
    const user = await User.findById(user_id)
    if(!user) throw createHttpError(404, `User ${user_id} not found`)
    res.send(user)
  } catch (error) {
    next(error)
  }

}

exports.update = async (req, res, next) => {
  // TODO: update user
  // TODO: admin rights update

  const { user_id } = req.params
  try {
    throw createHttpError(501,'Not implemented')
  } catch (error) {
    next(error)
  }

}

exports.delete_user = async (req, res, next) => {

  const { user_id } = req.params
  try {
    const user = await User.findByIdAndDelete(user_id)
    if(!user) throw createHttpError(404, `User ${user_id} not found`)
    res.send(user)
    require('../index.js').io.sockets.emit('user_deleted', {_id: user._id})
  } catch (error) {
    next(error)
  }

}



exports.create_admin_account = async () => {
  try {
    const password_hashed = await hash_password(ADMIN_PASSWORD)
    const userProperties = {
      username: 'admin',
      display_name: 'Administrator',
      password_hashed,
      isAdmin: true,
    }
    await User.create(userProperties)
    console.log(`Administrator account created`)
  } catch (error) {
    if(error.code === 11000) return console.log('Administrator account already existed')
    else throw error
  }
  
}