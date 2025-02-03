import express from 'express'

import auth from '../middlewares/auth'
import controller from '../controllers/tfaConfigs'
import permissions from '../middlewares/permissions'

const tfaConfigs = express.Router()

tfaConfigs.route('/').post(auth.isAuthenticated, controller.create)
tfaConfigs.route('/:id').patch(auth.isAuthenticated, permissions.isOwner, controller.update)
tfaConfigs.route('/:id').put(auth.isAuthenticated, permissions.isOwner, controller.update)

export default tfaConfigs
