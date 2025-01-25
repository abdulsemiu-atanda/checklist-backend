import logger from '../constants/logger'
import {isAdmin, isValidPreAuth, verifyToken} from '../../util/authTools'
import {redisKeystore} from '../../util/tools'

import {UNAUTHORIZED, UNPROCESSABLE} from '../constants/statusCodes'
import {INCOMPLETE_REQUEST, UNPROCESSABLE_REQUEST} from '../constants/messages'

const auth = {
  isLoggedIn: async (req, res, next) => {
    try {
      const keystore = redisKeystore()
      const decoded = verifyToken(req.headers.authorization)

      if (await keystore.retrieve(decoded.id)) {
        req.user = decoded

        next()
      } else {
        res.status(UNPROCESSABLE).send({message: UNPROCESSABLE_REQUEST, success: false})
      }
    } catch(error) {
      logger.error(error.message)

      res.status(UNPROCESSABLE).send({message: UNPROCESSABLE_REQUEST, success: false})
    }
  },
  isAdmin: async (req, res, next) => {
    try {
      const decoded = verifyToken(req.headers.authorization)

      if (await isAdmin(decoded))
        next()
      else
        res.status(UNAUTHORIZED).send({message: INCOMPLETE_REQUEST, success: false})
    } catch (error) {
      logger.error(error.message)

      res.status(UNPROCESSABLE).send({message: UNPROCESSABLE_REQUEST, success: false})
    }
  },
  isValidPreAuth: async (req, res, next) => {
    try {
      const token = req.headers.authorization

      if (await isValidPreAuth(token)) {
        req.preAuth = token

        next()
      } else {
        res.status(UNAUTHORIZED).send({message: INCOMPLETE_REQUEST, success: false})
      }
    } catch (error) {
      logger.error(error.message)

      res.status(UNPROCESSABLE).send({message: UNPROCESSABLE_REQUEST, success: false})
    }
  },
  isAuthenticated: async (req, res, next) => {
    try {
      const token = req.headers.authorization

      if (await isValidPreAuth(token)) {
        req.preAuth = token

        next()
      } else {
        await auth.isLoggedIn(req, res, next)
      }
    } catch (error) {
      logger.error(error.message)

      res.status(UNPROCESSABLE).send({message: UNPROCESSABLE_REQUEST, success: false})
    }
  }
}

export default auth
