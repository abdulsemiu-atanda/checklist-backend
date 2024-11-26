import express from 'express'

import rolesController from '../controllers/roles'

import authMiddleware from '../middlewares/auth'

const roles = express.Router()

roles.route('/').get(authMiddleware.isAdmin, rolesController.index)

export default roles
