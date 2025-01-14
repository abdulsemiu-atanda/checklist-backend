import nodemailer from 'nodemailer'
import sinon from 'sinon'
import {v4 as uuidV4} from 'uuid'

import * as cryptTools from '../src/util/cryptTools'
import logger from '../src/app/constants/logger'

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
