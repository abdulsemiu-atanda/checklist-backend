import AsymmetricEncryptionService from './AsymmetricEncryptionService'
import DataService from './DataService'
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

  #decryptTask({record, encryptor, userKey}) {
    return decryptFields({record, encryptor, userKey, fields: ['title', 'description']})
  }

  #encryptTask({record, encryptor, userKey}) { return encryptFields({record, encryptor, userKey}) }

  #session(userId) { return this.#keystore.retrieve(userId) }

  #userKey(userId) { return this.userKey.show({userId}) }

  #task(id) { return this.task.show({id}) }

  #updateTask({task, attributes: {status, ...payload}, currentUserId, encryptor}, callback) {
    const isOwner = task.userId === currentUserId
    const userId = isOwner ? currentUserId : task.userId

    return Promise.all([
      this.#userKey(userId),
      this.sharedKey.show({userId: task.userId}, {where: {ownableId: currentUserId}})
    ]).then(([userKey, sharedKey]) => {
      const encrypted = this.#encryptTask({record: payload, encryptor, userKey})
      const data = status ? {...encrypted, status} : encrypted

      return this.task.update(task.id, data).then(async record => {
        const keyPair = isOwner ? userKey : {privateKey: sharedKey.key}
        const decrypted = this.#decryptTask({record: record.toJSON(), encryptor, userKey: keyPair})

        callback({status: OK, response: {data: decrypted, success: true}})
      })
    })
  }

  #sharedTasks({userId, encryptor}) {
    const scope = {where: {ownableId: userId, ownableType: 'User'}}
    const include = {include: this.models.Task}

    return this.permission.index({...scope, ...include}).then(permissions => {
      const tasks = permissions.map(async permission => {
        const task = permission.Task.toJSON()
        const sharedKey = await this.sharedKey.show({userId: task.userId}, {where: {ownableId: userId}})

        return this.#decryptTask({record: task, encryptor, userKey: {privateKey: sharedKey.key}})
      })

      return Promise.all(tasks)
    })
  }

  create({task, userId}, callback) {
    this.#session(userId).then(session => {
      this.#userKey(userId).then(userKey => {
        const encryptor = new AsymmetricEncryptionService(session)
        const encrypted = this.#encryptTask({record: task, encryptor, userKey})

        return this.task.create({...encrypted, userId}).then(([record]) => {
          const decrypted = this.#decryptTask({record: record.toJSON(), encryptor, userKey})

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
      this.#userKey(userId).then(userKey => {
        return this.task.index(options).then(async records => {
          const encryptor = new AsymmetricEncryptionService(session)
          const data = records.map(record => this.#decryptTask({record: record.toJSON(), encryptor, userKey}))
          const shared = await this.#sharedTasks({userId, encryptor})

          callback({status: OK, response: {data: [...data, ...shared], success: true}})
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
      this.#task(id).then(task => {
        const encryptor = new AsymmetricEncryptionService(session)

        return this.#updateTask({task, attributes: payload, currentUserId: userId, encryptor}, callback)
      }).catch(error => {
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
            try {
              const value = secureHash(generateCode(9), 'base64url')

              this.token.create(
                {value, type: SHARING, userId: user.id, Invite: payload.invite},
                {include: this.models.Invite}
              ).then(([token]) => {
                this.permission.create({ownableId: token.Invite.id, ownableType: 'Invite', ...payload.permission}).then(() => {
                  callback({status: ACCEPTED, response: {data: token.Invite.toJSON(), message: 'Collaboration invite created', success: true}})
                })
              })
            } catch (error) {
              logger.error(error.message)

              callback({status: UNPROCESSABLE, response: {message: UNPROCESSABLE_REQUEST, success: false}})
            }
          } else {
            logger.error(`UserKey missing for user ${currentUserId}`)

            callback({status: UNPROCESSABLE, response: {message: UNPROCESSABLE_REQUEST, success: false}})
          }
        })
      } else {
        callback({status: ACCEPTED, response: {message: 'Collaboration invite created', success: true}}) 
      }
    })
  }
}

export default TaskService
