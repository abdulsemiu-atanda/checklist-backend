import jwt from 'jsonwebtoken'

import DataService from '../app/services/DataService'
import db from '../db/models'
import {ADMIN} from '../config/roles'
import logger from '../app/constants/logger'

export const userToken = (user, expiresIn = '1h') => jwt.sign(
  {id: user.id, roleId: user.roleId},
  process.env.SECRET,
  {expiresIn}
)

export const verifyToken = token => jwt.verify(token, process.env.SECRET)

export const generateCode = (size = 6, code = '') => {
  const digits = '0123456789'
  const position = Math.floor(Math.random() * 10)

  if (code.length === size)
    return code
  else
    return generateCode(size, `${code}${digits[position]}`)
}

export const isAdmin = user => {
  const role = new DataService(db.Role)

  return role.show({id: user.roleId})
    .then(record => record.name === ADMIN)
    .catch(error => {
      logger.error(error.message)

      return false
    })
}
