import DataService from './DataService'
import KeyService from './KeyService'
import SymmetricEncryptionService from './SymmetricEncryptionService'

import {isEmpty, redisKeystore} from '../../util/tools'
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

    this.userKey = new DataService(this.models.UserKey)
    this.task = new DataService(models.Task)
    this.user = new DataService(models.User)
    this.token = new DataService(models.Token)
    this.permission = new DataService(models.Permission)
    this.invite = new DataService(models.Invite)
    this.sharedKey = new DataService(models.SharedKey)
  }

  #decryptTask({record, encryptor}) {
    return decryptFields({record, encryptor, fields: ['title', 'description']})
  }

  #encryptTask({record, encryptor}) { return encryptFields({record, encryptor}) }

  #keyService(passphrase) { return new KeyService(this.models, passphrase)}

  #session(userId) { return this.#keystore.retrieve(userId) }

  #task(id) { return this.task.show({id}) }

  #updateTask({task, attributes: {status, ...payload}, encryptor}, callback) {
    const encrypted = this.#encryptTask({record: payload, encryptor})
    const data = status ? {...encrypted, status} : encrypted

    return this.task.update(task.id, data).then(record => {
      const decrypted = this.#decryptTask({record: record.toJSON(), encryptor})

      callback({status: OK, response: {data: decrypted, success: true}})
    })
  }

  #sharedTasks({userId, keyService}) {
    const scope = {where: {ownableId: userId, ownableType: 'User'}}
    const include = {include: this.models.Task}

    return this.permission.index({...scope, ...include}).then(permissions => {
      const tasks = permissions.map(async permission => {
        const task = permission.Task.toJSON()
        const taskKey = await keyService.rawTaskKey({taskUserId: task.userId, currentUserId: userId}) 
        const encryptor = new SymmetricEncryptionService(taskKey)

        return this.#decryptTask({record: task, encryptor})
      })

      return Promise.all(tasks)
    })
  }

  create({task, userId}, callback) {
    this.#session(userId).then(session => {
      const keyService = this.#keyService(session)

      keyService.rawTaskKey({taskUserId: userId, currentUserId: userId}).then(taskKey => {
        const encryptor = new SymmetricEncryptionService(taskKey)
        const encrypted = this.#encryptTask({record: task, encryptor})

        return this.task.create({...encrypted, userId}).then(([record]) => {
          const decrypted = this.#decryptTask({record: record.toJSON(), encryptor})

          callback({status: CREATED, response: {data: decrypted, success: true}})
        })
      }).catch(error => {
        logger.error(error.message)

        callback({status: UNPROCESSABLE, response: {message: UNPROCESSABLE_REQUEST, success: false}})
      })
    })
  }

  index({userId, options}, callback) {
    this.#session(userId).then(session => {
      this.task.index(options).then(async records => {
        const keyService = new KeyService(this.models, session)
        const taskKey = await keyService.rawTaskKey({taskUserId: userId, currentUserId: userId})
        const encryptor = new SymmetricEncryptionService(taskKey)
        const data = records.map(record => this.#decryptTask({record: record.toJSON(), encryptor}))
        const shared = await this.#sharedTasks({userId, keyService})

        callback({status: OK, response: {data: [...data, ...shared], success: true}})
      }).catch(error => {
        logger.error(error.message)

        callback({status: UNPROCESSABLE, response: {message: UNPROCESSABLE_REQUEST, success: false}})
      })
    })
  }

  show({id, userId}, callback) {
    this.#session(userId).then(session => {
      const keyService = this.#keyService(session)

      this.task.show({id}).then(record => {
        if (record) {
          keyService.rawTaskKey({taskUserId: record.userId, currentUserId: userId}).then(taskKey => {
            const encryptor = new SymmetricEncryptionService(taskKey)
            const decrypted = this.#decryptTask({record: record.toJSON(), encryptor})

            callback({status: OK, response: {data: decrypted, success: true}})
          })
        } else {
          callback({status: NOT_FOUND, response: {message: RECORD_NOT_FOUND, success: false}})
        }
      })
    })
  }

  update({id, payload, userId}, callback) {
    this.#session(userId).then(session => {
      const keyService = this.#keyService(session)

      this.#task(id).then(
        task => keyService.rawTaskKey({taskUserId: task.userId, currentUserId: userId})
          .then(taskKey => {
            const encryptor = new SymmetricEncryptionService(taskKey)

            return this.#updateTask({task, attributes: payload, encryptor}, callback)
          })
      ).catch(error => {
        logger.error(error.message)

        callback({status: UNPROCESSABLE, response: {message: UNPROCESSABLE_REQUEST, success: false}})
      })
    })
  }

  delete(id, callback) {
    this.task.destroy(id)
      .then(() => callback({status: ACCEPTED, response: {message: 'Record deleted', success: true}}))
  }

  inviteUser({currentUserId, payload}, callback) {
    this.invite.index({
      where: {emailDigest: digest(payload.invite?.email?.toLowerCase() || '')},
      include: this.models.Token
    }).then(invites => {
      if (isEmpty(invites) || invites.every(invite => invite.Token.userId !== currentUserId)) {
        this.user.show({id: currentUserId}, {include: this.models.UserKey}).then(user => {
          if (user?.UserKey) {
            const value = secureHash(generateCode(9), 'base64url')

            return this.token.create(
              {value, type: SHARING, userId: user.id, Invite: payload.invite},
              {include: this.models.Invite}
            ).then(([token]) => {
              return this.permission.create({ownableId: token.Invite.id, ownableType: 'Invite', ...payload.permission}).then(() => {
                callback({status: ACCEPTED, response: {data: token.Invite.toJSON(), message: 'Collaboration invite created', success: true}})
              })
            })
          } else {
            logger.error(`UserKey missing for user ${currentUserId}`)

            callback({status: UNPROCESSABLE, response: {message: UNPROCESSABLE_REQUEST, success: false}})
          }
        }).catch(error => {
          logger.error(error.message)

          callback({status: UNPROCESSABLE, response: {message: UNPROCESSABLE_REQUEST, success: false}})
        })
      } else {
        callback({status: ACCEPTED, response: {message: 'Collaboration invite created', success: true}}) 
      }
    })
  }
}

export default TaskService
