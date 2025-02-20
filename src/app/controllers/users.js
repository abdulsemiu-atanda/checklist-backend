import DataService from '../services/DataService'
import db from '../../db/models'
import {isAdmin} from '../../util/authTools'
import logger from '../constants/logger'

import {ACCEPTED, OK, UNPROCESSABLE} from '../constants/statusCodes'
import {ACCOUNT_DELETED, UNPROCESSABLE_REQUEST} from '../constants/messages'

const user = new DataService(db.User)

const users = {
  index: async (req, res) => {
    const adminUser = await isAdmin(req.user)
    const options = adminUser ?
      {attributes: {exclude: ['emailDigest', 'password']}} :
      {
        attributes: {exclude: ['emailDigest', 'password', 'roleId']},
        where: {id: req.user.id}
      }

    user.index(options)
      .then(records => res.status(OK).send({data: records, success: true}))
      .catch(error => {
        logger.error(error.message)

        res.status(UNPROCESSABLE).send({message: UNPROCESSABLE_REQUEST, success: false})
      })
  },
  destroy: (req, res) => {
    if (req.params.id === req.user.id) {
      user.destroy(req.params.id)
        .then(() => res.status(ACCEPTED).send({message: ACCOUNT_DELETED, success: true}))
        .catch(error => {
          logger.error(error.message)
          res.status(UNPROCESSABLE).send({message: UNPROCESSABLE_REQUEST, success: false})
        })
    } else {
      res.status(UNPROCESSABLE).send({message: UNPROCESSABLE_REQUEST, success: false})
    }
  }
}

export default users
