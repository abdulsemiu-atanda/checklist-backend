import bcrypt from 'bcrypt'

import DataService from '../services/DataService'
import db from '../../db/models'
import confirmUserEmail from '../mailers/confirmUserEmail'
import {formatData} from '../../util/dataTools'
import {dateToISOString, smtpServer} from '../../util/tools'
import {digest} from '../../util/cryptTools'
import logger from '../constants/logger'
import {generateCode, userToken} from '../../util/authTools'
import resetPasswordEmail from '../mailers/resetPasswordEmail'

import {USER} from '../../config/roles'
import {
  CREATED,
  CONFLICT,
  UNPROCESSABLE,
  BAD_REQUEST,
  UNAUTHORIZED,
  OK,
  ACCEPTED
} from '../constants/statusCodes'
import {
  ACCOUNT_CONFIRMED,
  ACCOUNT_CREATION_SUCCESS,
  INCOMPLETE_REQUEST,
  INCORRECT_EMAIL_PASSWORD,
  INVALID_EMAIL,
  LOGIN_SUCCESS,
  UNPROCESSABLE_REQUEST
} from '../constants/messages'

const confirmation = new DataService(db.Confirmation)
const user = new DataService(db.User)
const role = new DataService(db.Role)
const token = new DataService(db.Token)
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
const smtp = smtpServer()

const auth = {
  create: (req, res) => {
    if (EMAIL_REGEX.test(req.body.email)) {
      role.show({name: USER}).then(record => {
        if (record) {
          user.create({emailDigest: digest(req.body.email.toLowerCase()), ...req.body, roleId: record.id}).then(([newUser, created]) => {
            if (created) {
              const token = userToken(newUser.toJSON())

              res.status(CREATED).send({message: ACCOUNT_CREATION_SUCCESS, token, success: true})
            } else {
              res.status(CONFLICT).send({message: INCOMPLETE_REQUEST, success: false})
            }
          }).catch(({errors}) => {
            const [error] = errors

            logger.error(error.message)
            res.status(UNPROCESSABLE).send({message: UNPROCESSABLE_REQUEST, success: false})
          })
        } else {
          res.status(UNPROCESSABLE).send({message: UNPROCESSABLE_REQUEST, success: false})
        }
      })
    } else {
      res.status(BAD_REQUEST).send({message: INVALID_EMAIL, success: false})
    }
  },
  confirm: (req, res) => {
    try {
      confirmation.show({codeDigest: digest(req.body.code)}, {include: db.User})
        .then(record => {
          if (record) {
            record.User.update({confirmedAt: dateToISOString(Date.now())})
              .then(() => {
                confirmation.destroy(record.id)

                res.status(OK).send({message: ACCOUNT_CONFIRMED, success: true})
              })
          } else {
            res.status(BAD_REQUEST).send({message: INCOMPLETE_REQUEST, success: false})
          }
        })
    } catch (error) {
      logger.error(error.message)

      res.status(UNPROCESSABLE).send({message: UNPROCESSABLE_REQUEST, success: false})
    }
  },
  login: (req, res) => {
    if (EMAIL_REGEX.test(req.body.email)) {
      user.show({emailDigest: digest(req.body.email.toLowerCase())}).then(record => {
        if (record) {
          if (bcrypt.compareSync(req.body.password, record.password)) {
            const token = userToken(record.toJSON())

            res.status(OK).send({
              message: LOGIN_SUCCESS,
              token,
              user: formatData(record.toJSON(), ['id', 'firstName', 'lastName', 'email', 'confirmed', 'createdAt', 'updatedAt']),
              success: true
            })
          } else {
            res.status(UNAUTHORIZED).send({message: INCORRECT_EMAIL_PASSWORD, success: false})
          }
        } else {
          res.status(UNAUTHORIZED).send({message: INCORRECT_EMAIL_PASSWORD, success: false})
        }
      })
    } else {
      res.status(UNAUTHORIZED).send({message: INCORRECT_EMAIL_PASSWORD, success: false})
    }
  },
  resendConfirmation: (req, res) => {
    if (EMAIL_REGEX.test(req.body.email)) {
      user.show({emailDigest: digest(req.body.email.toLowerCase())}, {include: db.Confirmation}).then(record => {
        if (record) {
          if (record.Confirmation)
            smtp.delay(3000).send(confirmUserEmail(record.toJSON(), record.Confirmation.code))

          res.status(OK).send({message: 'Account confirmation email sent.', success: true})
        } else {
          res.status(OK).send({message: 'Account confirmation email sent.', success: true})
        }
      })
    } else {
      res.status(UNPROCESSABLE).send({message: UNPROCESSABLE_REQUEST, success: false})
    }
  },
  resetPassword: (req, res) => {
    if (EMAIL_REGEX.test(req.body.email)) {
      user.show({emailDigest: digest(req.body.email.toLowerCase())}).then(record => {
        if (record) {
          record.createToken({value: digest(generateCode(8))}).then(data => {
            smtp.delay(3000).send(resetPasswordEmail(record.toJSON(), data.value))

            res.status(ACCEPTED).send({message: 'Password reset requested.', success: true})
          }).catch(error => {
            logger.error(error.message)

            res.status(ACCEPTED).send({message: 'Password reset requested.', success: true})
          })
        } else {
          res.status(ACCEPTED).send({message: 'Password reset requested.', success: true})
        }
      })
    } else {
      res.status(UNPROCESSABLE).send({message: UNPROCESSABLE_REQUEST, success: false})
    }
  },
  validateResetToken: (req, res) => {
    token.show({value: req.params.token}).then(record => {
      res.status(OK).send({data: record?.id, success: true})
    }).catch(error => {
      logger.error(error.message)

      res.status(UNPROCESSABLE).send({message: UNPROCESSABLE_REQUEST, success: false})
    })
  },
  changePassword: (req, res) => {
    try {
      token.show({id: req.body.tokenId}, {include: db.User}).then(record => {
        if (record && req.body.password === req.body.confirmPassword) {
          record.User.update({password: req.body.password}).then(() => {
            token.destroy(record.id)

            res.status(OK).send({message: 'Password reset successful.', success: true})
          })
        } else {
          res.status(UNPROCESSABLE).send({message: UNPROCESSABLE_REQUEST, success: false})
        }
      }).catch(error => {
        logger.error(error.message)

        res.status(UNPROCESSABLE).send({message: UNPROCESSABLE_REQUEST, success: false})
      })
    } catch (error) {
      logger.error(error.message)

      res.status(UNPROCESSABLE).send({message: UNPROCESSABLE_REQUEST, success: false})
    }
  }
}

export default auth
