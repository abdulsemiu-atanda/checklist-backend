import express from 'express'

import authController from '../controllers/auth'

const auth = express.Router()

auth.route('/sign-up').post(authController.create)
auth.route('/sign-in').post(authController.login)

export default auth
