const User = require("./models/user.js")
const createHttpError = require("http-errors")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const dotenv = require("dotenv")

dotenv.config()

const { JWT_SECRET = "keyboardcat" } = process.env

// aliases for bcrypt functions
const hash_password = (password_plain) => bcrypt.hash(password_plain, 10)
const check_password = (password_plain, password_hashed) =>
  bcrypt.compare(password_plain, password_hashed)

const retrieve_jwt = (req, res) => {
  return (
    req.headers.authorization?.split(" ")[1] || req.query.jwt || req.query.token
  )
}

const generate_token = (user) =>
  new Promise((resolve, reject) => {
    const token_content = { user_id: user._id }
    jwt.sign(token_content, JWT_SECRET, (error, token) => {
      if (error) return reject(createHttpError(500, error))
      resolve(token)
      console.log(`[Auth] Token generated for user ${user._id}`)
    })
  })

const decode_token = (token) =>
  new Promise((resolve, reject) => {
    const { JWT_SECRET } = process.env
    if (!JWT_SECRET) return reject(createHttpError(500, `Token secret not set`))
    jwt.verify(token, JWT_SECRET, (error, decoded_token) => {
      if (error) return reject(createHttpError(403, `Invalid JWT`))
      resolve(decoded_token)
    })
  })

exports.login = async (req, res, next) => {
  try {
    const username = req.body.username || req.body.identifier
    const { password } = req.body

    // Todo: use JOY
    if (!username) throw createHttpError(400, `Missing username`)
    if (!password) throw createHttpError(400, `Missing password`)

    const query = { username }

    const user = await User.findOne(query).select("+password_hashed")

    if (!user) throw createHttpError(403, `User ${username} does not exist`)

    const password_correct = await check_password(
      password,
      user.password_hashed
    )
    if (!password_correct) throw createHttpError(403, `Incorrect password`)

    const jwt = await generate_token(user)

    res.send({ jwt, user })

    console.log(`[Auth] Successful login for user ${user._id}`)
  } catch (error) {
    next(error)
  }
}

exports.middleware = async (req, res, next) => {
  try {
    const token = retrieve_jwt(req, res)
    if (!token) throw `Missing JWT`
    const { user_id } = await decode_token(token)

    const user = await User.findOne({ _id: user_id }).select("+password_hashed")

    res.locals.user = user

    next()
  } catch (error) {
    next(error)
  }
}

exports.middleware_lax = async (req, res, next) => {
  try {
    const token = retrieve_jwt(req, res)
    if (!token) throw `Missing JWT`
    const { user_id } = await decode_token(token)

    const user = await User.findOne({ _id: user_id }).select("+password_hashed")

    res.locals.user = user
  } catch (error) {
    // Nothing
  } finally {
    next()
  }
}

exports.admin_only_middleware = async (req, res, next) => {
  try {
    const token = retrieve_jwt(req, res)
    if (!token) throw `Missing JWT`
    const { user_id } = await decode_token(token)

    const user = await User.findOne({ _id: user_id }).select("+password_hashed")

    if (!user.isAdmin) throw "User is not administrator"

    res.locals.user = user

    next()
  } catch (error) {
    next(error)
  }
}

exports.admin_or_device_middleware = async (req, res, next) => {
  try {
    const token = retrieve_jwt(req, res)
    if (!token) throw `Missing JWT`
    const { user_id } = await decode_token(token)

    // Allow devices to proceed
    if (user_id === "device") return next()

    const user = await User.findOne({ _id: user_id }).select("+password_hashed")

    if (!user.isAdmin) throw "User is not administrator"

    res.locals.user = user

    next()
  } catch (error) {
    next(error)
  }
}

exports.get_device_jwt = async (req, res, next) => {
  // Generate JWT for readers
  try {
    const jwt = await generate_token({ _id: "device" })
    res.send(jwt)
  } catch (error) {
    next(error)
  }
}

exports.decode_token = decode_token
exports.generate_token = generate_token
exports.check_password = check_password
exports.hash_password = hash_password
