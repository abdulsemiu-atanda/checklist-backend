import {expect} from 'chai'

import EncryptionService from '../../../src/app/services/EncryptionService'

const PASSPHRASE = 'testing'
const service = new EncryptionService(PASSPHRASE)

describe('EncryptionService', () => {
  describe('#constructor', () => {
    it('initializes with the string data type', () => {
      expect(service.key).to.have.length(7)
      expect(service.iv).to.have.length(12)
    })

    it('throws an error with invalid passphrase data type', () => {
      expect(() => { new EncryptionService(1234) }).to.throw(TypeError, 'Invalid initialization parameters, expect key: [String].')
    })
  })

  describe('#digest', () => {
    it('returns a SHA-256 digest of the encryption key', done => {
      service.digest().then(digest => {
        expect(digest.byteLength).to.equal(32)

        done()
      })
    })
  })

  describe('#encrypt', () => {
    it('throws an error for undefined method', done => {
      service.encrypt('Baba Agbalagba').catch(error => {
        expect(error.message).to.equal('encrypt is undefined')
        expect(error.name).to.equal('ReferenceError')

        done()
      })
    })
  })

  describe('#decrypt', () => {
    it('throws an error for undefined method', done => {
      service.decrypt('tjha==yuhbqf').catch(error => {
        expect(error.message).to.equal('decrypt is undefined')
        expect(error.name).to.equal('ReferenceError')

        done()
      })
    })
  })
})
