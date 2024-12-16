import logger from '../constants/logger'
import {isAdmin, verifyToken} from '../../util/authTools'

import {UNAUTHORIZED, UNPROCESSABLE} from '../constants/statusCodes'
import {INCOMPLETE_REQUEST, UNPROCESSABLE_REQUEST} from '../constants/messages'

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
  isAdmin: async (req, res, next) => {
    try {
      const decoded = verifyToken(req.headers.authorization)

      if (await isAdmin(decoded))
        next()
      else
        res.status(UNAUTHORIZED).send({message: INCOMPLETE_REQUEST})
    } catch (error) {
      logger.error(error.message)

      res.status(UNPROCESSABLE).send({message: UNPROCESSABLE_REQUEST})
    }
  }
}

export default auth
