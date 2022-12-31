const cors = require("cors")
const http = require("http")
const express = require("express")
const socketio = require("socket.io")
const db = require("./db")
const User = require("./models/user")

const port = 7342

const app = express()
const http_server = http.Server(app)
const io = socketio(http_server)

exports.io = io
exports.getIo = () => io

db.connect()

app.use(cors())
app.use(express.json())

app.get("/", (req, res) => {
  res.send("MoreillonPay API")
})
app.use("/auth", require("./routes/auth"))
app.use("/users", require("./routes/users"))
app.use("/transactions", require("./routes/transactions"))

// Express error handling
app.use((error, req, res, next) => {
  console.error(error)
  let { statusCode = 500, message = error } = error
  if (isNaN(statusCode) || statusCode > 600) statusCode = 500
  res.status(statusCode).send(message)
})

http_server.listen(port, () => {
  console.log(`[HTTP] MoreillonPay listening on *:${port}`)
})

io.sockets.on("connection", async (socket) => {
  console.log("[WS] User connected")

  // TODO: user_list emit
  const users = await User.find({})
  socket.emit("user_list", users)

  socket.on("disconnect", () => {
    console.log("[WS] user disconnected")
  })
})
