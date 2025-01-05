import InviteService from '../services/InviteService'
import db from '../../db/models'

const service = new InviteService(db)

const invites = {
  update: (req, res) => {
    service.update({id: req.params.id, currentUserId: req.user.id, payload: req.body}, ({status, response}) => {
      res.status(status).send(response)
    })
  },
  index: (req, res) => {
    service.index(req.user.id, ({status, response}) => {
      res.status(status).send(response)
    })
  }
}

export default invites
