import {expect} from 'chai'

import SymmetricEncryptionService from '../../../src/app/services/SymmetricEncryptionService'

const PASSPHRASE = process.env.DATA_ENCRYPTION_KEY
const PLAINTEXT = 'Lorem Ippsium'
const service = new SymmetricEncryptionService(PASSPHRASE)

let encrypted

describe('SymmetricEncryptionService', () => {
  describe('#encrypt', () => {
    it('encrypts data successfully', () => {
      encrypted = service.encrypt(PLAINTEXT)

      expect(encrypted).to.not.equal(PLAINTEXT)
    })
  })

  describe('#decrypt', () => {
    it('decrypts data successfully', () => {
      expect(service.decrypt(encrypted)).to.equal(PLAINTEXT)
    })

    it('throw an error with an invalid passphrase', () => {
      const symmetricService = new SymmetricEncryptionService('8cb97ba87758bb3ae136b9f3f4ac89fd')

      expect(() => { symmetricService.decrypt(encrypted) }).to.throw(/bad decrypt/)
    })
  })
})
