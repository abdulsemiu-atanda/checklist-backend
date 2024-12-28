import db from '../../db/models'
import AuthService from '../services/AuthService'

const service = new AuthService(db)

const auth = {
  create: (req, res) => {
    service.create(req.body, ({status, response}) => {
      res.status(status).send(response)
    })
  },
  confirm: (req, res) => {
    service.confirm(req.body, ({status, response}) => {
      res.status(status).send(response)
    })
  },
  login: (req, res) => {
    service.login(req.body, ({status, response}) => {
      res.status(status).send(response)
    })
  },
  resendConfirmation: (req, res) => {
    service.resendConfirmation(req.body, ({status, response}) => {
      res.status(status).send(response)
    })
  },
  resetPassword: (req, res) => {
    service.resetPassword(req.body, ({status, response}) => {
      res.status(status).send(response)
    })
  },
  validateResetToken: (req, res) => {
    service.validateResetToken(req.params, ({status, response}) => {
      res.status(status).send(response)
    })
  },
  changePassword: (req, res) => {
    service.changePassword(req.body, ({status, response}) => {
      res.status(status).send(response)
    })
  }
}

export default auth
