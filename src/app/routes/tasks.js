import express from 'express'

import controller from '../controllers/tasks'
import middleware from '../middlewares/auth'
import permissions from '../middlewares/permissions'

const tasks = express.Router()

tasks.route('/').post(middleware.isLoggedIn, controller.create)
tasks.route('/').get(middleware.isLoggedIn, controller.index)
tasks.route('/:id').get(middleware.isLoggedIn, permissions.isOwner, controller.show)
tasks.route('/:id').patch(middleware.isLoggedIn, permissions.isOwner, controller.update)
tasks.route('/:id').put(middleware.isLoggedIn, controller.update)
tasks.route('/:id').delete(middleware.isLoggedIn, permissions.isOwner, controller.destroy)
tasks.route('/:id/invite').post(middleware.isLoggedIn, permissions.isOwner, controller.invite)

export default tasks
