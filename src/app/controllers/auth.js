import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

import DataService from '../services/DataService'
import db from '../../db/models'
import {formatData} from '../../util/dataTools'
import {digest} from '../../util/cryptTools'
import logger from '../constants/logger'

import {USER} from '../../config/roles'
import {CREATED, CONFLICT, UNPROCESSABLE, BAD_REQUEST, UNAUTHORIZED, OK} from '../constants/statusCodes'

const user = new DataService(db.User)
const role = new DataService(db.Role)
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

const auth = {
  create: (req, res) => {
    if (EMAIL_REGEX.test(req.body.email)) {
      role.show({name: USER}).then(record => {
        if (record) {
          user.create({...req.body, RoleId: record.id}).then(([newUser]) => {
            const token = jwt.sign({id: newUser.id, roleId: newUser.RoleId}, process.env.SECRET, {expiresIn: '1h'})

            res.status(CREATED).send({message: 'User successfully created.', token})
          }).catch(({errors}) => {
            const [error] = errors

            logger.error(error.message)
            res.status(CONFLICT).send({message: 'Unable to complete request.'})
          })
        } else {
          res.status(UNPROCESSABLE).send({message: 'Unable to process request. Please try again later.'})
        }
      })
    } else {
      res.status(BAD_REQUEST).send({message: 'Invalid Email'})
    }
  },
  login: (req, res) => {
    if (EMAIL_REGEX.test(req.body.email)) {
      user.show({emailDigest: digest(req.body.email.toLowerCase())}).then(record => {
        if (record) {
          if (bcrypt.compareSync(req.body.password, record.password)) {
            const token = jwt.sign({id: record.id, roleId: record.RoleId}, process.env.SECRET, {expiresIn: '1h'})

            res.status(OK).send({
              message: 'Login Successful',
              token,
              user: formatData(record.toJSON(), ['id', 'firstName', 'lastName', 'email', 'createdAt', 'updatedAt'])
            })
          } else {
            res.status(UNAUTHORIZED).send({message: 'Email and/or password incorrect'})
          }
        } else {
          res.status(UNAUTHORIZED).send({message: 'Email and/or password incorrect'})
        }
      })
    } else {
      res.status(UNAUTHORIZED).send({message: 'Email and/or password incorrect'})
    }
  }
}

export default auth
