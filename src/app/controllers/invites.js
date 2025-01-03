import InviteService from '../services/InviteService'
import db from '../../db/models'

const service = new InviteService(db)

const invites = {
  send: (req, res) => {
    service.send({id: req.params.id, currentUserId: req.user.id}, ({status, response}) => {
      res.status(status).send(response)
    })
  },
  resend: (req, res) => {
    service.resend({id: req.params.id, currentUserId: req.user.id}, ({status, response}) => {
      res.status(status).send(response)
    })
  }
}

export default invites
