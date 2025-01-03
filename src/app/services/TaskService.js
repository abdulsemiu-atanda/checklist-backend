import AsymmetricEncryptionService from './AsymmetricEncryptionService'
import DataService from './DataService'
import {redisKeystore, smtpServer} from '../../util/tools'
import {generateCode} from '../../util/authTools'
import {decryptFields, digest, encryptFields, secureHash} from '../../util/cryptTools'
import logger from '../constants/logger'

import {ACCEPTED, CREATED, NOT_FOUND, OK, UNPROCESSABLE} from '../constants/statusCodes'
import {RECORD_NOT_FOUND, UNPROCESSABLE_REQUEST} from '../constants/messages'
import {SHARING} from '../../config/tokens'

class TaskService {
  #keystore = redisKeystore()

  constructor(models) {
    this.models = models
    this.smtp = smtpServer()

    this.userKey = new DataService(this.models.UserKey)
    this.task = new DataService(models.Task)
    this.user = new DataService(models.User)
    this.token = new DataService(models.Token)
    this.permission = new DataService(models.Permission)
  }

  #decryptTask({record, encryptor, userKey}) {
    return decryptFields({record, encryptor, userKey, fields: ['title', 'description']})
  }

  #encryptTask({record, encryptor, userKey}) { return encryptFields({record, encryptor, userKey}) }

  #session(userId) { return this.#keystore.retrieve(userId) }

  #userKey(userId) { return this.userKey.show({userId}) }

  create({task, userId}, callback) {
    this.#session(userId).then(session => {
      this.#userKey(userId).then(userKey => {
        const encryptor = new AsymmetricEncryptionService(session)
        const encrypted = this.#encryptTask({record: task, encryptor, userKey})

        this.task.create({...encrypted, userId}).then(([record]) => {
          const decrypted = this.#decryptTask({record: record.toJSON(), encryptor, userKey})

          callback({status: CREATED, response: {data: decrypted, success: true}})
        })
      }).catch(error => {
        logger.error(error.message)

        callback({status: UNPROCESSABLE, response: {message: UNPROCESSABLE_REQUEST, success: false}})
      })
    })
  }

  index(userId, callback) {
    this.#session(userId).then(session => {
      this.#userKey(userId).then(userKey => {
        this.task.index().then(records => {
          const encryptor = new AsymmetricEncryptionService(session)
          const data = records.map(record => this.#decryptTask({record: record.toJSON(), encryptor, userKey}))

          callback({status: OK, response: {data, success: true}})
        })
      }).catch(error => {
        logger.error(error.message)

        callback({status: UNPROCESSABLE, response: {message: UNPROCESSABLE_REQUEST, success: false}})
      })
    })
  }

  show({id, userId}, callback) {
    this.#session(userId).then(session => {
      this.#userKey(userId).then(userKey => {
        this.task.show({id}).then(record => {
          if (record) {
            const encryptor = new AsymmetricEncryptionService(session)
            const decrypted = this.#decryptTask({record: record.toJSON(), encryptor, userKey})

            callback({status: OK, response: {data: decrypted, success: true}})
          } else {
            callback({status: NOT_FOUND, response: {message: RECORD_NOT_FOUND, success: false}})
          }
        })
      })
    })
  }

  update({id, payload, userId}, callback) {
    this.#session(userId).then(session => {
      const {status, ...attributes} = payload

      this.#userKey(userId).then(userKey => {
        const encryptor = new AsymmetricEncryptionService(session)
        const encrypted = this.#encryptTask({record: attributes, encryptor, userKey})
        const task = status ? {...encrypted, status} : encrypted

        this.task.update(id, task).then(record => {
          const data = this.#decryptTask({record: record.toJSON(), encryptor, userKey})

          callback({status: OK, response: {data, success: true}})
        }).catch(error => {
          logger.error(error.message)

          callback({status: UNPROCESSABLE, response: {message: UNPROCESSABLE_REQUEST, success: false}})
        })
      })
    })
  }

  delete(id, callback) {
    this.task.destroy(id)
      .then(() => callback({status: ACCEPTED, response: {message: 'Record deleted', success: true}}))
  }

  inviteUser({currentUserId, payload}, callback) {
    this.user.show({id: currentUserId}, {include: this.models.UserKey}).then(user => {
      if (user?.UserKey) {
        this.user.show({emailDigest: digest(payload.invite.email.toLowerCase())}).then(existing => {
          try {
            const value = secureHash(generateCode(9), 'base64url')

            if (existing) {
              this.token.create({
                value,
                type: SHARING,
                userId: user.id,
                tokenableId: existing.id,
                tokenableType: 'User',
                Invite: payload.invite
              }, {include: this.models.Invite}).then(() => {
                this.permission.create({ownableId: existing.id, ownableType: 'User', ...payload.permission}).then(() => {
                  callback({status: ACCEPTED, response: {message: 'Collaboration invite created', success: true}})
                })
              })
            } else {
              this.token.create(
                {value, type: SHARING, userId: user.id, Invite: payload.invite},
                {include: this.models.Invite}
              ).then(([token]) => {
                this.token.update(token.id, {tokenableId: token.Invite.id, tokenableType: 'Invite'})

                this.permission.create({ownableId: token.Invite.id, ownableType: 'Invite', ...payload.permission}).then(() => {
                  callback({status: ACCEPTED, response: {message: 'Collaboration invite created', success: true}})
                })
              })
            }
          } catch (error) {
            logger.error(error.message)

            callback({status: UNPROCESSABLE, response: {message: UNPROCESSABLE_REQUEST, success: false}})
          }
        })
      } else {
        logger.error(`UserKey missing for user ${currentUserId}`)

        callback({status: UNPROCESSABLE, response: {message: UNPROCESSABLE_REQUEST, success: false}})
      }
    })
  }
}

export default TaskService
