import * as OTPAuth from 'otpauth'

import DataService from './DataService'
import {formatData} from '../../util/dataTools'
import {isEmpty, redisKeystore} from '../../util/tools'
import logger from '../constants/logger'
import {generateCode, refreshToken, userToken} from '../../util/authTools'
import {secureHash} from '../../util/cryptTools'

import {CREATED, OK, UNAUTHORIZED, UNPROCESSABLE} from '../constants/statusCodes'
import {ACTIVE, DISABLED} from '../../config/tfaStatuses'
import {INCOMPLETE_REQUEST, UNPROCESSABLE_REQUEST} from '../constants/messages'

class TfaService {
  #APP_NAME = 'Checklist'

  constructor(models) {
    this.models = models
    this.keystore = redisKeystore()
    this.user = new DataService(models.User)
    this.tfaConfig = new DataService(models.TfaConfig)
  }

  #issuer() {
    if (process.env.NODE_ENV === 'development')
      return `${this.#APP_NAME} Local`

    return this.#APP_NAME
  }

  #totp({url, user = {}}) {
    if (url) {
      return OTPAuth.URI.parse(url)
    } else {
      return new OTPAuth.TOTP({
        algorithm: 'SHA256',
        issuer: this.#issuer(),
        label: `${user.firstName} (${user.email})`,
        secret: new OTPAuth.Secret({size: 32})
      })
    }
  }

  #validate({url, token}) {
    const counter = this.#totp({url}).validate({token})

    if (counter === 0 || counter > 0)
      return counter + 1

    return 0
  }

  #response(user) {
    return {
      token: userToken(user),
      refreshToken: refreshToken(user),
      user: formatData(
        user,
        ['id', 'firstName', 'lastName', 'email', 'confirmed', 'createdAt', 'updatedAt']
      ),
      success: true
    }
  }

  #preAuth(token) {
    if (token) {
      return this.keystore.retrieve(token).then(data => {
        const [userId, password] = data.split('|')

        return [userId, password]
      })
    } else {
      return Promise.resolve([])
    }
  }

  activate({tfaConfig: {User: user, ...config}, payload, password}, callback) {
    const {code} = payload
    const isValid = Boolean(this.#validate({url: config.url, token: code}))

    if (isValid) {
      this.tfaConfig.update(config.id, {status: ACTIVE}).then(record => {
        const authResponse = password ? this.#response(user) : {success: true}

        if (password)
          this.keystore.insert({key: user.id, value: password})
        callback({status: OK, response: {...authResponse, data: {...record.toJSON(), backupCode: generateCode(16)}}})
      }).catch(error => {
        logger.error(error.message)

        callback({status: UNPROCESSABLE, response: {message: UNPROCESSABLE_REQUEST, success: false}})
      })
    } else {
      callback({status: UNAUTHORIZED, response: {message: INCOMPLETE_REQUEST, success: false}})
    }
  }

  create({userId}, callback) {
    this.user.show({id: userId}, {include: this.models.TfaConfig}).then(currentUser => {
      if (currentUser.TfaConfig) {
        callback({status: CREATED, response: {data: currentUser.TfaConfig.toJSON(), success: true}})
      } else {
        return currentUser.createTfaConfig({
          url: this.#totp({user: currentUser.toJSON()}).toString()
        }).then(tfaConfig => {
          callback({status: CREATED, response: {data: tfaConfig.toJSON(), success: true}})
        })
      }
    }).catch(error => {
      logger.error(error.message)

      callback({status: UNPROCESSABLE, response: {message: UNPROCESSABLE_REQUEST, success: false}})
    })
  }

  login({preAuth, payload: {code, backupCode}}, callback) {
    this.#preAuth(preAuth).then(([userId, password]) => {
      this.user.show({id: userId}, {include: this.models.TfaConfig}).then(currentUser => {
        const {TfaConfig: tfaConfig, ...user} = currentUser.toJSON()

        if (tfaConfig?.status === ACTIVE) {
          const isValid = code ?
            Boolean(this.#validate({url: tfaConfig.url, token: code})) :
            (secureHash(backupCode, 'base64url') === tfaConfig.backupCode)

          if (isValid) {
            if (backupCode)
              currentUser.TfaConfig.update({status: DISABLED, backupCode: null, url: null})

            this.keystore.insert({key: currentUser.id, value: password})
            callback({status: OK, response: this.#response(user)})
          } else {
            callback({status: UNAUTHORIZED, response: {message: INCOMPLETE_REQUEST, success: false}})
          }
        } else {
          callback({status: UNAUTHORIZED, response: {message: INCOMPLETE_REQUEST, success: false}})
        }
      })
    })
  }

  update({id, preAuth = '', attributes: {status, backupCode, activate}}, callback) {
    this.tfaConfig.show({id}, {include: this.models.User}).then(tfaConfig => {
      if (activate) {
        // eslint-disable-next-line no-unused-vars
        this.#preAuth(preAuth).then(([_, password]) => {
          this.activate(
            {tfaConfig: tfaConfig.toJSON(), payload: activate, password},
            callback
          )
        })
      } else {
        let payload = {}

        if (status)
          payload = {...payload, status}

        if (backupCode)
          payload = {...payload, backupCode}

        if (isEmpty(payload)) {
          callback({status: UNPROCESSABLE, response: {message: UNPROCESSABLE_REQUEST, success: false}})
        } else {
          return tfaConfig.update(payload)
            .then(record => callback({
              status: OK,
              response: {data: record.toJSON(), success: true}
            }))
        }
      }
    }).catch(error => {
      logger.error(error.message)

      callback({status: UNPROCESSABLE, response: {message: UNPROCESSABLE_REQUEST, success: false}})
    })
  }
}

export default TfaService
