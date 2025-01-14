import bcrypt from 'bcrypt'

import AsymmetricEncryptionService from './AsymmetricEncryptionService'
import confirmUserEmail from '../mailers/confirmUserEmail'
import DataService from './DataService'
import {dateToISOString, redisKeystore, smtpServer} from '../../util/tools'
import {digest, updatePrivateKey} from '../../util/cryptTools'
import {formatData} from '../../util/dataTools'
import {generateCode, userToken} from '../../util/authTools'
import logger from '../constants/logger'
import resetPasswordEmail from '../mailers/resetPasswordEmail'

import {USER} from '../../config/roles'
import {ACCEPTED, BAD_REQUEST, CONFLICT, CREATED, OK, UNAUTHORIZED, UNPROCESSABLE} from '../constants/statusCodes'
import {
  ACCOUNT_CONFIRMED,
  ACCOUNT_CREATION_SUCCESS,
  INCOMPLETE_REQUEST,
  INCORRECT_EMAIL_PASSWORD,
  INVALID_EMAIL,
  LOGIN_SUCCESS,
  UNPROCESSABLE_REQUEST
} from '../constants/messages'
import {PASSWORD} from '../../config/tokens'

class AuthService {
  #EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

  constructor(models) {
    this.keystore = redisKeystore()
    this.models = models
    this.smtp = smtpServer()

    this.confirmation = new DataService(models.Confirmation)
    this.user = new DataService(models.User)
    this.role = new DataService(models.Role)
    this.token = new DataService(models.Token)
  }

  #validEmail(email) { return this.#EMAIL_REGEX.test(email) }

  #createUserKey({user, password}) {
    if (!user.UserKey) {
      const encryptor = new AsymmetricEncryptionService(password)

      encryptor.generateKeyPair().then(({SHAFingerprint, ...keyPair}) => {
        user.createUserKey({...keyPair, fingerprint: SHAFingerprint}).then(() => {
          logger.info(`UserKey created for user ${user.id}`)
        }).catch(error => {
          logger.error(error.message)
        })
      }).catch(error => {
        logger.error(error.message)
      })
    }
  }

  #updatePrivateKey({user, password}) {
    user.getUserKey().then(userKey => {
      if (userKey) {
        const privateKey = updatePrivateKey({backupKey: userKey.backupKey, passphrase: password})

        userKey.update({privateKey}).then(() => logger.info(`Updated private key for user ${user.id}`))
      } else {
        this.#createUserKey({user, password})
      }
    })
  }

  create(payload, callback, afterCreate) {
    if (this.#validEmail(payload.email)) {
      this.role.show({name: USER}).then(role => {
        if (role) {
          this.user.create({
            emailDigest: digest(payload.email.toLowerCase()),
            ...payload,
            roleId: role.id
          }).then(([user, created]) => {
            if (created) {
              const token = userToken(user.toJSON())

              this.#createUserKey({user, password: payload.password})
              this.keystore.insert({key: user.id, value: payload.password})

              if (afterCreate)
                afterCreate(user.id)

              callback({status: CREATED, response: {token, message: ACCOUNT_CREATION_SUCCESS, success: true}})
            } else {
              callback({status: CONFLICT, response: {message: INCOMPLETE_REQUEST, success: false}})
            }
          }).catch(error => {
            logger.error(error.message)

            callback({status: UNPROCESSABLE, response: {message: UNPROCESSABLE_REQUEST, success: false}})
          })
        } else {
          callback({status: UNPROCESSABLE, response: {message: UNPROCESSABLE_REQUEST, success: false}})
        }
      })
    } else {
      callback({status: BAD_REQUEST, response: {message: INVALID_EMAIL, success: false}})
    }
  }

  confirm(payload, callback) {
    try {
      this.confirmation.show({codeDigest: digest(payload.code)}, {include: this.models.User}).then(confirmation => {
        if (confirmation) {
          confirmation.User.update({confirmedAt: dateToISOString(Date.now())}).then(() => {
            this.confirmation.destroy(confirmation.id)

            callback({status: OK, response: {message: ACCOUNT_CONFIRMED, success: true}})
          })
        } else {
          callback({status: BAD_REQUEST, response: {message: INCOMPLETE_REQUEST, success: false}})
        }
      })
    } catch (error) {
      logger.error(error.message)

      callback({status: UNPROCESSABLE, response: {message: UNPROCESSABLE_REQUEST, success: false}})
    }
  }

  login(payload, callback) {
    if (this.#validEmail(payload.email)) {
      this.user.show({emailDigest: digest(payload.email.toLowerCase())}, {include: this.models.UserKey}).then(user => {
        if (user) {
          if (bcrypt.compareSync(payload.password, user.password)) {
            const token = userToken(user.toJSON())

            this.#createUserKey({user, password: payload.password})
            this.keystore.insert({key: user.id, value: payload.password})
            callback({
              status: OK,
              response: {
                token,
                user: formatData(
                  user.toJSON(),
                  ['id', 'firstName', 'lastName', 'email', 'confirmed', 'createdAt', 'updatedAt']
                ),
                message: LOGIN_SUCCESS,
                success: true
              }
            })
          } else {
            callback({status: UNAUTHORIZED, response: {message: INCORRECT_EMAIL_PASSWORD, success: false}})
          }
        } else {
          callback({status: UNAUTHORIZED, response: {message: INCORRECT_EMAIL_PASSWORD, success: false}})
        }
      })
    } else {
      callback({status: UNAUTHORIZED, response: {message: INCORRECT_EMAIL_PASSWORD, success: false}})
    }
  }

  resendConfirmation(payload, callback) {
    if (this.#validEmail(payload.email)) {
      this.user.show({emailDigest: digest(payload.email.toLowerCase())}, {include: this.models.Confirmation}).then(user => {
        if (user) {
          if (user.Confirmation)
            this.smtp.delay(3000).send(confirmUserEmail(user.toJSON(), user.Confirmation.code))

          callback({status: OK, response: {message: 'Account confirmation email sent.', success: true}})
        } else {
          callback({status: OK, response: {message: 'Account confirmation email sent.', success: true}})
        }
      })
    } else {
      callback({status: UNPROCESSABLE, response: {message: UNPROCESSABLE_REQUEST, success: false}})
    }
  }

  resetPassword(payload, callback) {
    if (this.#validEmail(payload.email)) {
      this.user.show({emailDigest: digest(payload.email.toLowerCase())}).then(user => {
        if (user && user.confirmed) {
          user.createToken({value: digest(generateCode(8))}).then(token => {
            this.smtp.delay(3000).send(resetPasswordEmail(user.toJSON(), token.value))

            callback({status: ACCEPTED, response: {message: 'Password reset requested.', success: true}})
          }).catch(error => {
            logger.error(error.message)

            callback({status: ACCEPTED, response: {message: 'Password reset requested.', success: true}})
          })
        } else {
          callback({status: ACCEPTED, response: {message: 'Password reset requested.', success: true}})
        }
      })
    } else {
      callback({status: UNPROCESSABLE, response: {message: UNPROCESSABLE_REQUEST, success: false}})
    }
  }

  validateResetToken(payload, callback) {
    this.token.show({value: payload.token}).then(token => {
      callback({status: OK, response: {data: token?.id, success: true}})
    }).catch(error => {
      logger.error(error.message)

      callback({status: UNPROCESSABLE, response: {message: UNPROCESSABLE_REQUEST, success: false}})
    })
  }

  changePassword(payload, callback) {
    this.token.show(
      {id: payload.tokenId},
      {include: this.models.User, where: {type: PASSWORD}}
    ).then(token => {
      if (token && payload.password === payload.confirmPassword) {
        token.User.update({password: payload.password}).then(() => {
          this.#updatePrivateKey({user: token.User, password: payload.password})
          this.token.destroy(token.id)

          callback({status: OK, response: {message: 'Password reset successful.', success: true}})
        })
      } else {
        callback({status: UNPROCESSABLE, response: {message: UNPROCESSABLE_REQUEST, success: false}})
      }
    }).catch(error => {
      logger.error(error.message)

      callback({status: UNPROCESSABLE, response: {message: UNPROCESSABLE_REQUEST, success: false}})
    })
  }

  logout(user, callback) {
    this.keystore.remove(user.id).then(
      () => callback({status: ACCEPTED, response: {message: 'Logout Successful.', success: true}})
    )
  }
}

export default AuthService
