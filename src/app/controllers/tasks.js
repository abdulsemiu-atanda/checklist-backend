import db from '../../db/models'

import {eagerLoading} from '../../util/dataTools'
import TaskService from '../services/TaskService'

const service = new TaskService(db)

const tasks = {
  create: (req, res) => {
    service.create({task: req.body, userId: req.user.id}, ({status, response}) => {
      res.status(status).send(response)
    })
  },
  index: (req, res) => {
    const scope = {where: {userId: req.user.id}}
    const options = req.query.include ? {...scope, include: eagerLoading(req.query.include, db)} : scope

    service.index({userId: req.user.id, options}, ({status, response}) => {
      res.status(status).send(response)
    })
  },
  show: (req, res) => {
    service.show({id: req.params.id, userId: req.user.id}, ({status, response}) => {
      res.status(status).send(response)
    })
  },
  update: (req, res) => {
    service.update({id: req.params.id, payload: req.body, userId: req.user.id}, ({status, response}) => {
      res.status(status).send(response)
    })
  },
  destroy: (req, res) => {
    service.delete(req.params.id, ({status, response}) => {
      res.status(status).send(response)
    })
  },
  invite: (req, res) => {
    service.inviteUser({
      taskId: req.params.id,
      currentUserId: req.user.id,
      payload: {...req.body, permission: {...req.body.permission, taskId: req.params.id}}
    }, ({status, response}) => {
      res.status(status).send(response)
    })
  }
}

export default tasks
