import express from 'express'

import rolesController from '../controllers/roles'

const roles = express.Router()

roles.route('/').get(rolesController.index)

export default roles
