import sinon from 'sinon'

import {smtpServer} from '../src/util/tools'
import logger from '../src/app/constants/logger'

export const smtpStub = sinon.stub(smtpServer(), 'delay').returns({
  send: email => logger.info(`Simulated sending an email to: ${email.to}`)
})
