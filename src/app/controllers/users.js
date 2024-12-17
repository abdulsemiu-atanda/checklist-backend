import DataService from '../services/DataService'
import db from '../../db/models'
import {isAdmin} from '../../util/authTools'
import logger from '../constants/logger'

import {OK, UNPROCESSABLE} from '../constants/statusCodes'
import {UNPROCESSABLE_REQUEST} from '../constants/messages'

const user = new DataService(db.User)

const users = {
  index: async (req, res) => {
    const adminUser = await isAdmin(req.user)
    const options = adminUser ?
      {attributes: {exclude: ['emailDigest', 'password']}} :
      {
        attributes: {exclude: ['emailDigest', 'password', 'RoleId']},
        where: {id: req.user.id}
      }

    user.index(options)
      .then(records => res.status(OK).send({data: records, success: true}))
      .catch(error => {
        logger.error(error.message)

        res.status(UNPROCESSABLE).send({message: UNPROCESSABLE_REQUEST, success: false})
      })
  }
}

export default users
