const { Router } = require('express')
const {
    login,
    get_device_jwt,
} = require('../auth')

const router = Router()

router.route('/login')
    .post(login)

router.route('/device_jwt')
    .get(get_device_jwt)

module.exports = router