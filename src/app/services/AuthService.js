import bcrypt from 'bcrypt'
import crypto from 'crypto'

import AsymmetricEncryptionService from './AsymmetricEncryptionService'
import confirmUserEmail from '../mailers/confirmUserEmail'
import DataService from './DataService'
import {dateToISOString, redisKeystore, smtpServer} from '../../util/tools'
import {digest, secureHash, updatePrivateKey} from '../../util/cryptTools'
import {formatData} from '../../util/dataTools'
import {generateCode, refreshToken, userToken} from '../../util/authTools'
import logger from '../constants/logger'
import resetPasswordEmail from '../mailers/resetPasswordEmail'

import {ACTIVE} from '../../config/tfaStatuses'
import {ADMIN, USER} from '../../config/roles'
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
    this.sharedKey = new DataService(models.SharedKey)
    this.token = new DataService(models.Token)
  }

  #validEmail(email) { return this.#EMAIL_REGEX.test(email) }

  #createUserKey({user, password}) {
    if (!user.UserKey) {
      const encryptor = new AsymmetricEncryptionService(password)

      return encryptor.generateKeyPair().then(({SHAFingerprint, ...keyPair}) => {
        return user.createUserKey({...keyPair, fingerprint: SHAFingerprint}).then(userKey => {
          logger.info(`UserKey created for user ${user.id}`)

          return userKey
        })
      }).catch(error => {
        logger.error(error.message)
      })
    }

    return Promise.resolve()
  }

  #createTaskKey({user, password, userKey}) {
    if (userKey) {
      const encryptor = new AsymmetricEncryptionService(password)

      this.sharedKey.show({userId: user.id}, {where: {ownableId: user.id}}).then(sharedKey => {
        if (sharedKey) {
          logger.info(`Task Key already created for ${user.id}`)
        } else {
          user.createSharedKey({
            key: encryptor.encrypt({
              publicKey: userKey.publicKey,
              data: crypto.randomBytes(64).toString('hex'),
              fingerprint: userKey.fingerprint
            }),
            ownableId: user.id
          })
        }
      })
    } else {
      logger.info(`Unable to create task key for ${user.id}. Please create a UserKey first.`)
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

  #success(user, callback) {
    const token = userToken(user)

    callback({
      status: OK,
      response: {
        token,
        refreshToken: refreshToken(user),
        user: formatData(
          user,
          ['id', 'firstName', 'lastName', 'email', 'confirmed', 'createdAt', 'updatedAt']
        ),
        message: LOGIN_SUCCESS,
        success: true
      }
    })
  }

  #needsPreAuth(user) { return (user.TfaConfig?.status === ACTIVE || user.Role.name === ADMIN) }

  #preAuthResponse({user, password}, callback) {
    const preAuthToken = this.keystore.encryptor.encrypt(secureHash(user.id))

    // insert pre auth token that expires in 10mins
    this.keystore.insert({key: preAuthToken, value: `${user.id}|${password}`, expiresIn: 600})
    callback({status: OK, response: {preAuthToken, data: user.TfaConfig, success: true}})
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
                .then(userKey => this.#createTaskKey({user, password: payload.password, userKey}))
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
      this.user.show(
        {emailDigest: digest(payload.email.toLowerCase())},
        {
          include: [
            this.models.UserKey,
            this.models.Role,
            {model: this.models.TfaConfig, attributes: {exclude: ['backupCode', 'url']}}
          ]
        }
      ).then(user => {
        if (user) {
          if (bcrypt.compareSync(payload.password, user.password)) {
            const currentUser = user.toJSON()

            this.#createUserKey({user, password: payload.password})
              .then(userKey => this.#createTaskKey({user, password: payload.password, userKey: userKey || user.UserKey}))

            if (this.#needsPreAuth(currentUser)) {
              this.#preAuthResponse({user: currentUser, password: payload.password}, callback)
            } else {
              this.keystore.insert({key: user.id, value: payload.password})
              this.#success(currentUser, callback)
            }
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

  refreshToken({token, user}, callback) {
    const check = secureHash(`${user.id}${user.roleId}`, 'base64url')

    this.keystore.retrieve(user.id).then(session => {
      if (bcrypt.compareSync(check, token)) {
        this.user.show({id: user.id}).then(currentUser => {
          const authToken = userToken(currentUser.toJSON())

          this.keystore.insert({key: currentUser.id, value: session})
          callback({status: OK, response: {token: authToken, message: 'Session extended successfully.', success: true}})
        })
      } else {
        callback({status: UNAUTHORIZED, response: {message: INCOMPLETE_REQUEST, success: false}})
      }
    })
  }
}

export default AuthService
