import logger from '../src/app/constants/logger'
import {redisKeystore} from '../src/util/tools'
import {smtpStub} from './testHelpers'

const keystore = redisKeystore()

export const mochaHooks = {
  beforeAll(done) {
    keystore.client.on('error', error => logger.error(`REDIS error ${error}`))
    keystore.client.connect().then(() => {
      logger.info('REDIS connection established.')

      done()
    })
  },
  afterEach() {
    smtpStub.resetHistory()
  },
  afterAll(done) {
    keystore.client.quit().then(() => {
      logger.info('REDIS connection closed.')

      done()
    })
  }
}
