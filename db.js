const mongoose = require("mongoose")
const dotenv = require("dotenv")
const { create_admin_account } = require("./controllers/users.js")

dotenv.config()

const { MONGODB_URL = "mongodb://localhost", MONGODB_DB = "moreillon_pay" } =
  process.env

const mongoose_connection_string = `${MONGODB_URL}/${MONGODB_DB}`

const connect = () => {
  console.log("[Mongoose] Attempting initial connection...")
  mongoose
    .connect(mongoose_connection_string)
    .then(() => {
      console.log("[Mongoose] Initial connection successful")
      create_admin_account()
    })
    .catch((error) => {
      console.log("[Mongoose] Initial connection failed")
      setTimeout(connect, 5000)
    })
}

const db = mongoose.connection
db.on("error", console.error.bind(console, "[Mongoose] connection error:"))
db.once("open", () => {
  console.log("[Mongoose] Connected")
})

exports.db = MONGODB_DB
exports.url = MONGODB_URL
exports.connect = connect
exports.connected = () => mongoose.connection.readyState
