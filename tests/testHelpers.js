import nodemailer from 'nodemailer'
import sinon from 'sinon'
import {v4 as uuidV4} from 'uuid'

import * as cryptTools from '../src/util/cryptTools'
import logger from '../src/app/constants/logger'
import {redisKeystore} from '../src/util/tools'
import {userToken} from '../src/util/authTools'

export const smtpStub = sinon.stub(nodemailer, 'createTransport').returns({
  sendMail: (email, callback) => {
    logger.info(`Simulated sending an email to: ${email.to}`)
    callback(null, {messageId: uuidV4()})
  }
})

export function memoize(func) {
  const cache = {}

  return function(...args) {
    const key = JSON.stringify(args)

    if (cache[key]) {
      logger.info('Loading key pair from cache...')
      return cache[key]
    } else {
      logger.info('Generating key pair...')
      const result = func.apply(this, args)
      cache[key] = result

      return result
    }
  }
}

export const memoizedGenerateKeyPair = memoize(cryptTools.generateKeyPair)

export const generateKeyPairStub = sinon.stub(cryptTools, 'generateKeyPair').callsFake(memoizedGenerateKeyPair)

export const tokenGenerator = async ({user, password}) => {
  const keystore = redisKeystore()

  if (process.env.NODE_ENV === 'test') {
    await keystore.insert({key: user.id, value: password})

    return userToken(user)
  } else {
    throw new Error('tokenGenerator should only be used in test environment.')
  }
}
