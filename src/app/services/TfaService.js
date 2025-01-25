import * as OTPAuth from 'otpauth'

import DataService from './DataService'
import {formatData} from '../../util/dataTools'
import {isEmpty} from '../../util/tools'
import logger from '../constants/logger'
import {refreshToken, userToken} from '../../util/authTools'
import {secureHash} from '../../util/cryptTools'

import {CREATED, OK, UNAUTHORIZED, UNPROCESSABLE} from '../constants/statusCodes'
import {ACTIVE, DISABLED} from '../../config/tfaStatuses'
import {INCOMPLETE_REQUEST, UNPROCESSABLE_REQUEST} from '../constants/messages'

class TfaService {
  #APP_NAME = 'Checklist'

  constructor(models) {
    this.models = models
    this.user = new DataService(models.User)
    this.tfaConfig = new DataService(models.TfaConfig)
  }

  #label(user) {
    if (process.env.NODE_ENV === 'development')
      return `${user.firstName} Local (${user.email})`

    return `${user.firstName} (${user.email})`
  }

  #totp({url, user = {}}) {
    if (url) {
      return OTPAuth.URI.parse(url)
    } else {
      return new OTPAuth.TOTP({
        algorithm: 'SHA256',
        issuer: this.#APP_NAME,
        label: this.#label(user),
        secret: new OTPAuth.Secret({size: 32})
      })
    }
  }

  #validate({url, token}) {
    return this.#totp({url}).validate({token})
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

  login({userId, payload: {code, backupCode}}, callback) {
    this.user.show({id: userId}, {include: this.models.TfaConfig}).then(currentUser => {
      const {TfaConfig: tfaConfig, ...user} = currentUser.toJSON()

      if (tfaConfig?.status === ACTIVE) {
        const isValid = code ? Boolean(this.#validate({url: tfaConfig.url, token: code})) : (secureHash(backupCode, 'base64url') === tfaConfig.backupCode)

        if (isValid) {
          if (backupCode)
            tfaConfig.update({status: DISABLED, backupCode: null, url: null})

          callback({status: OK, response: this.#response(user)})
        } else {
          callback({status: UNAUTHORIZED, response: {message: INCOMPLETE_REQUEST, success: false}})
        }
      } else {
        callback({status: UNAUTHORIZED, response: {message: INCOMPLETE_REQUEST, success: false}})
      }
    })
  }

  update({id, attributes: {status, backupCode}}, callback) {
    this.tfaConfig.show({id}).then(tfaConfig => {
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
    }).catch(error => {
      logger.error(error.message)

      callback({status: UNPROCESSABLE, response: {message: UNPROCESSABLE_REQUEST, success: false}})
    })
  }
}

export default TfaService
