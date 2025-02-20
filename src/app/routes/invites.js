import express from 'express'

import controller from '../controllers/invites'
import middleware from '../middlewares/auth'

const invites = express.Router()

invites.route('/:id').patch(middleware.isLoggedIn, controller.update)
invites.route('/').get(middleware.isLoggedIn, controller.index)
invites.route('/:tokenId/accept').post(controller.accept)

export default invites
