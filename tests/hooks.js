import {smtpStub} from './testHelpers'

export const mochaHooks = {
  afterEach() {
    smtpStub.resetHistory()
  }
}
