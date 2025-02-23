const express = require('express')
const { getUserProfilePage } = require('../../controllers/user/profileController')
const userGuestMiddleware = require('../../middlewares/userGuestMiddleware')
const router = express.Router()


router.route('/').get(userGuestMiddleware,getUserProfilePage).post()

module.exports = router