import AsymmetricEncryptionService from './AsymmetricEncryptionService'
import DataService from './DataService'
import {redisKeystore} from '../../util/tools'
import {decryptFields, encryptFields} from '../../util/cryptTools'

import {CREATED, OK, UNAUTHORIZED, UNPROCESSABLE} from '../constants/statusCodes'
import {INCOMPLETE_REQUEST, UNPROCESSABLE_REQUEST} from '../constants/messages'
import logger from '../constants/logger'

class TaskService {
  #keystore = redisKeystore()

  constructor(models) {
    this.models = models
    this.userKey = new DataService(this.models.UserKey)

    this.task = new DataService(models.Task)
    this.user = new DataService(models.User)
  }

  #decryptTask({record, encryptor, userKey}) {
    return decryptFields({record, encryptor, userKey, fields: ['title', 'description']})
  }

  #encryptTask({record, encryptor, userKey}) { return encryptFields({record, encryptor, userKey}) }

  #session(userId) { return this.#keystore.retrieve(userId) }

  #userKey(userId) { return this.userKey.show({userId}) }

  create({task, userId}, callback) {
    this.#session(userId).then(session => {
      if (session) {
        const encryptor = new AsymmetricEncryptionService(session)

        this.#userKey(userId).then(userKey => {
          const encrypted = this.#encryptTask({record: task, encryptor, userKey})

          this.task.create({...encrypted, userId}).then(([record]) => {
            const decrypted = this.#decryptTask({record: record.toJSON(), encryptor, userKey})

            callback({status: CREATED, response: {data: decrypted, success: true}})
          })
        }).catch(error => {
          logger.error(error.message)

          callback({status: UNPROCESSABLE, response: {message: UNPROCESSABLE_REQUEST, success: false}})
        })
      } else {
        callback({status: UNAUTHORIZED, response: {message: INCOMPLETE_REQUEST, success: false}})
      }
    })
  }

  index(userId, callback) {
    this.#session(userId).then(session => {
      if (session) {
        const encryptor = new AsymmetricEncryptionService(session)

        this.#userKey(userId).then(userKey => {
          this.task.index().then(records => {
            const data = records.map(record => this.#decryptTask({record: record.toJSON(), encryptor, userKey}))

            callback({status: OK, response: {data, success: true}})
          })
        }).catch(error => {
          logger.error(error.message)

          callback({status: UNPROCESSABLE, response: {message: UNPROCESSABLE_REQUEST, success: false}})
        })
      } else {
        callback({status: UNAUTHORIZED, response: {message: INCOMPLETE_REQUEST, success: false}})
      }
    })
  }
}

export default TaskService
