import express from 'express'

import controller from '../controllers/tasks'
import middleware from '../middlewares/auth'

const tasks = express.Router()

tasks.route('/').post(middleware.isLoggedIn, controller.create)
tasks.route('/').get(middleware.isLoggedIn, controller.index)
tasks.route('/:id').get(middleware.isLoggedIn, controller.show)

export default tasks
