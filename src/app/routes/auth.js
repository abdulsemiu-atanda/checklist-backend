import express from 'express'

import authController from '../controllers/auth'
import middleware from '../middlewares/auth'

const auth = express.Router()

auth.route('/sign-up').post(authController.create)
auth.route('/sign-in').post(authController.login)
auth.route('/confirm').post(authController.confirm)
auth.route('/resend-confirmation').post(authController.resendConfirmation)
auth.route('/reset-password').post(authController.resetPassword)
auth.route('/validate-token/:token').get(authController.validateResetToken)
auth.route('/change-password').post(authController.changePassword)
auth.route('/logout').post(middleware.isLoggedIn, authController.logout)

export default auth
