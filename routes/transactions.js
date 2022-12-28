const { Router } = require('express')
const {
    create_transaction,
    read_transactions,
} = require('../controllers/transactions')
const { 
    admin_or_device_middleware,
    admin_only_middleware,
} = require('../auth')

const router = Router()

router.route('/')
    .post(admin_or_device_middleware,create_transaction)
    .get(admin_only_middleware, read_transactions)

module.exports = router