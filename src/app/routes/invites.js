import express from 'express'

import controller from '../controllers/invites'
import middleware from '../middlewares/auth'

const invites = express.Router()

invites.route('/:id/send').get(middleware.isLoggedIn, controller.send)
invites.route('/:id/resend').get(middleware.isLoggedIn, controller.resend)
invites.route('/').get(middleware.isLoggedIn, controller.index)

export default invites
