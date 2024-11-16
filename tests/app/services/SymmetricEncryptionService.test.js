import {expect} from 'chai'

import SymmetricEncryptionService from '../../../src/app/services/SymmetricEncryptionService'

const PASSPHRASE = 'shabalala'
const PLAINTEXT = 'Lorem Ippsium'
const service = new SymmetricEncryptionService(PASSPHRASE)

let encrypted

describe('SymmetricEncryptionService', () => {
  describe('#encrypt', () => {
    it('encrypts data successfully', done => {
      service.encrypt(PLAINTEXT).then(data => {
        encrypted = data

        expect(data).to.not.equal(PLAINTEXT)

        done()
      })
    })
  })

  describe('#decrypt', () => {
    it('decrypts data successfully', done => {
      service.decrypt(encrypted).then(data => {
        expect(data).to.equal(PLAINTEXT)

        done()
      })
    })

    it('throw an error with an invalid passphrase', done => {
      const symmetricService = new SymmetricEncryptionService('testing')

      symmetricService.decrypt(encrypted).catch(error => {
        expect(error.message).to.equal('The operation failed for an operation-specific reason')

        done()
      })
    })
  })
})
