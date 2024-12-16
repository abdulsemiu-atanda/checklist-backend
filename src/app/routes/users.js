import express from 'express'

import controller from '../controllers/users'
import middleware from '../middlewares/auth'

const users = express.Router()

users.route('/').get(middleware.isLoggedIn, controller.index)

export default users