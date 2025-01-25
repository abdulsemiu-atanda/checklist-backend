import db from '../../db/models'
import TfaService from '../services/TfaService'

const service = new TfaService(db)

const tfaConfigs = {
  create: (req, res) => {
    service.create({userId: req.user.id, preAuth: req.preAuth}, ({status, response}) => {
      res.status(status).send(response)
    })
  },
  update: (req, res) => {
    service.update({id: req.params.id, attributes: req.body}, ({status, response}) => {
      res.status(status).send(response)
    })
  },
  login: (req, res) => {
    service.login({preAuth: req.preAuth, payload: req.body}, ({status, response}) => {
      res.status(status).send(response)
    })
  }
}

export default tfaConfigs
