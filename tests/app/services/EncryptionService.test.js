import {expect} from 'chai'

import EncryptionService from '../../../src/app/services/EncryptionService'

const PASSPHRASE = process.env.DATA_ENCRYPTION_KEY
const service = new EncryptionService(PASSPHRASE)

describe('EncryptionService', () => {
  describe('#constructor', () => {
    it('initializes key with correct length', () => expect(service.key).to.have.length(32))

    it('throws an error with invalid passphrase data type', () => {
      expect(() => { new EncryptionService(1234) }).to.throw(TypeError, 'Invalid initialization parameters, expect key: [String] with length 32.')
      expect(() => { new EncryptionService('testing') }).to.throw(TypeError, 'Invalid initialization parameters, expect key: [String] with length 32.')
    })

    it('does not required fixed key length in asymmetric mode', () => {
      const encryption = new EncryptionService('v3ryS3cr3tAffa!r', 'asymmetric')

      expect(encryption.key).to.equal('v3ryS3cr3tAffa!r')
    })
  })

  describe('#encrypt', () => {
    it('throws an error for undefined method', () => {
      expect(() => { service.encrypt('Baba Agbalagba') }).to.throw(ReferenceError, 'encrypt is undefined')
    })
  })

  describe('#decrypt', () => {
    it('throws an error for undefined method', () => {
      expect(() => { service.decrypt('48cb97ba87758bb3ae136b9f3f4') }).to.throw(ReferenceError, 'decrypt is undefined')
    })
  })
})
