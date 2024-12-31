import {expect} from 'chai'
import {fakerYO_NG as faker} from '@faker-js/faker'

import * as cryptTools from '../../src/util/cryptTools'

const passphrase = faker.internet.password()

let keyPair

describe('cryptTools:', () => {
  before(done => {
    cryptTools.generateKeyPair(passphrase).then(data => {
      keyPair = data

      done()
    })
  })

  describe('#updatePrivateKey', () => {
    it('returns a re-encrypted private key', () => {
      const newPrivateKey = cryptTools.updatePrivateKey({backupKey: keyPair.backupKey, passphrase: faker.internet.password()})

      expect(newPrivateKey).to.exist
      expect(newPrivateKey).to.not.equal(keyPair.privateKey)
    })
  })
})
