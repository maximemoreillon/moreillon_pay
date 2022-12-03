const { MongoClient } = require('mongodb')
const dotenv = require('dotenv')

// Load .env file content as environment variables
dotenv.config()

const {
    MONGODB_URL = 'mongodb://localhost:27017',
    MONGODB_DB_NAME = 'moreillonpay'
} = process.env


const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}

let db


MongoClient.connect(MONGODB_URL, options)
    .then(client => {
        console.log(`[MongoDB] Connected`)
        db = client.db(MONGODB_DB_NAME)
    })
    .catch(console.log)

exports.url = MONGODB_URL
exports.name = MONGODB_DB_NAME
exports.get_db = () => db