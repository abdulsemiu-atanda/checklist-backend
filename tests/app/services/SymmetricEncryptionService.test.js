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
      const symmetricService = new SymmetricEncryptionService('b3stb4nd1nd4w0rld54ll0v3r0r4ng3s')

      expect(() => { symmetricService.decrypt(encrypted) }).to.throw(/bad decrypt/)
    })
  })
})
