import express from 'express'

import authController from '../controllers/auth'

const auth = express.Router()

auth.route('/sign-up').post(authController.create)
auth.route('/sign-in').post(authController.login)
auth.route('/confirm').post(authController.confirm)
auth.route('/resend-confirmation').post(authController.resendConfirmation)
auth.route('/reset-password').post(authController.resetPassword)
auth.route('/validate-reset-token/:token').get(authController.validateResetToken)

export default auth
