import {expect} from 'chai'
import {fakerYO_NG as faker} from '@faker-js/faker'

import AsymmetricEncryptionService from '../../../src/app/services/AsymmetricEncryptionService'

const MODE = 'asymmetric'
const data = faker.book.title()
const passphrase = faker.internet.password()
const service = new AsymmetricEncryptionService(passphrase, MODE)

let keyPair
let encrypted

describe('AsymmetricEncryptionService:', () => {
  before(done => {
    service.generateKeyPair().then(data => {
      keyPair = data

      done()
    })
  })

  describe('#constructor', () => {
    it('builds object correctly', () => {
      expect(service.key).to.equal(passphrase)
    })
  })

  describe('#encrypt', () => {
    it('throw an error if fingerprint is invalid', () => {
      expect(() => {
        service.encrypt({publicKey: keyPair.publicKey, data, fingerprint: faker.internet.ipv6()})
      }).to.throw(Error, 'ENCRYPTION_ERROR] Unable to verify public key with provided fingerprint')
    })

    it('encrypts data if fingerpring is valid', () => {
      encrypted = service.encrypt({data, publicKey: keyPair.publicKey, fingerprint: keyPair.SHAFingerprint})

      expect(encrypted).to.exist
    })
  })

  describe('#decrypt', () => {
    it('decrypts data correctly', () => {
      expect(service.decrypt({privateKey: keyPair.privateKey, encrypted})).to.equal(data)
    })
  })
})
