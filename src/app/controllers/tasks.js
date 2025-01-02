import db from '../../db/models'

import TaskService from '../services/TaskService'

const service = new TaskService(db)

const tasks = {
  create: (req, res) => {
    service.create({task: req.body, userId: req.user.id}, ({status, response}) => {
      res.status(status).send(response)
    })
  },
  index: (req, res) => {
    service.index(req.user.id, ({status, response}) => {
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
  }
}

export default tasks
