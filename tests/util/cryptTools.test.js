import {expect} from 'chai'
import {fakerYO_NG as faker} from '@faker-js/faker'

import * as cryptTools from '../../src/util/cryptTools'
import {fakeUser} from '../fixtures/users'
import SymmetricEncryptionService from '../../src/app/services/SymmetricEncryptionService'

const passphrase = fakeUser.password
const data = {title: faker.book.title(), description: faker.company.catchPhrase()}
const encryptor = new SymmetricEncryptionService(passphrase)

let keyPair
let encrypted

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

  describe('#encryptFields', () => {
    it('encrypts all fields', () => {
      encrypted = cryptTools.encryptFields({record: data, encryptor})

      expect(encrypted.title).to.exist
      expect(encrypted.title).to.not.equal(data.title)
      expect(encrypted.description).to.exist
      expect(encrypted.description).to.not.equal(data.description)
    })
  })

  describe('#decryptFields', () => {
    it('does not decrypt any field if none is specified', () => {
      const decrypted = cryptTools.decryptFields({record: encrypted, encryptor})

      expect(decrypted.title).to.exist
      expect(decrypted.title).to.equal(encrypted.title)
      expect(decrypted.description).to.exist
      expect(decrypted.description).to.equal(encrypted.description)
    })

    it('does not decrypt if no specified field exists in encrypted object', () => {
      const decrypted = cryptTools.decryptFields({record: encrypted, encryptor, fields: ['name', 'age']})

      expect(decrypted.title).to.exist
      expect(decrypted.title).to.equal(encrypted.title)
      expect(decrypted.description).to.exist
      expect(decrypted.description).to.equal(encrypted.description)
    })

    it('only decrypts existing fields', () => {
      const decrypted = cryptTools.decryptFields({record: encrypted, encryptor, fields: ['name', 'description']})

      expect(decrypted.name).to.not.exist
      expect(decrypted.title).to.exist
      expect(decrypted.title).to.equal(encrypted.title)
      expect(decrypted.description).to.exist
      expect(decrypted.description).to.equal(data.description)
    })

    it('decrypts all specified fields', () => {
      const decrypted = cryptTools.decryptFields({record: encrypted, encryptor, fields: ['title', 'description']})

      expect(decrypted.title).to.exist
      expect(decrypted.title).to.equal(data.title)
      expect(decrypted.description).to.exist
      expect(decrypted.description).to.equal(data.description)
    })
  })
})
