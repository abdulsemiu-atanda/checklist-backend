import {ADMIN} from '../../config/roles'
import DataService from '../services/DataService'
import db from '../../db/models'
import logger from '../constants/logger'
import {BAD_REQUEST, UNPROCESSABLE} from '../constants/statusCodes'
import {INCOMPLETE_REQUEST, UNPROCESSABLE_REQUEST} from '../constants/messages'
import {verifyToken} from '../../util/authTools'


const role = new DataService(db.Role)

const auth = {
  isLoggedIn: (req, res, next) => {
    try {
      const decoded = verifyToken(req.headers.authorization)

      req.user = decoded
      next()
    } catch(error) {
      logger.error(error.message)

      res.status(UNPROCESSABLE).send({message: UNPROCESSABLE_REQUEST})
    }
  },
  isAdmin: (req, res, next) => {
    try {
      const decoded = verifyToken(req.headers.authorization)

      role.show({id: decoded.roleId}).then(record => {
        if (record && record.name === ADMIN) 
          next()
        else
          res.status(BAD_REQUEST).send({message: INCOMPLETE_REQUEST})
      })
    } catch (error) {
      logger.error(error.message)

      res.status(UNPROCESSABLE).send({message: UNPROCESSABLE_REQUEST})
    }
  }
}

export default auth
