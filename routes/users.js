const { Router } = require('express')
const {
    create_user,
    read_users,
    read_user,
    update_user,
    update_user_password,
    delete_user,
} = require('../controllers/users')
const { 
    admin_only_middleware,
    middleware_lax,
    middleware,
} = require('../auth')


const router = Router()

router.route('/')
    .post(admin_only_middleware, create_user)
    // TODO: Consider whether normal user can see all users
    .get(middleware_lax,read_users)

router.route('/:user_id')
    // TODO: Consider whether normal user can see all users
    .get(middleware_lax,read_user)
    .delete(admin_only_middleware, delete_user)
    .patch(admin_only_middleware, update_user)

router.route('/:user_id/password')
    .patch(middleware, update_user_password)

module.exports = router