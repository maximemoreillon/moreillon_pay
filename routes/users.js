const { Router } = require('express')
const {
    create_user,
    get_all_users,
    get_user,
    delete_user
} = require('../controllers/users')

const router = Router()

router.route('/')
    .post(create_user)
    .get(get_all_users)

router.route('/:user_id')
    .get(get_user)
    .delete(delete_user)

module.exports = router