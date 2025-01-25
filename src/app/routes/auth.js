import express from 'express'

import authController from '../controllers/auth'
import middleware from '../middlewares/auth'
import tfa from '../controllers/tfaConfigs'

const auth = express.Router()

auth.route('/sign-up').post(authController.create)
auth.route('/sign-in').post(authController.login)
auth.route('/confirm').post(authController.confirm)
auth.route('/resend-confirmation').post(authController.resendConfirmation)
auth.route('/reset-password').post(authController.resetPassword)
auth.route('/validate-token/:token').get(authController.validateResetToken)
auth.route('/change-password').post(authController.changePassword)
auth.route('/logout').get(middleware.isLoggedIn, authController.logout)
auth.route('/:refreshToken').get(middleware.isLoggedIn, authController.refreshToken)
auth.route('/tfa-login').post(middleware.isValidPreAuth, tfa.login)

export default auth
