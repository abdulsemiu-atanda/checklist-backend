import {expect} from 'chai'
import {v4 as uuidV4} from 'uuid'

import {create} from '../../../fixtures'
import {fakeUser} from '../../../fixtures/users'
import {generateKeyPair} from '../../../../src/util/cryptTools'
import db from '../../../../src/db/models'

const UserKey = db.UserKey

let data
let user
let userKey

describe('UserKey Model:', () => {
  before(done => {
    db.sequelize.sync({force: true}).then(() => {
      generateKeyPair(fakeUser.password).then(({SHAFingerprint, ...keyPair}) => {
        data = {...keyPair, SHAFingerprint}

        create({type: 'users', data: fakeUser}).then(([record]) => {
          user = record
          userKey = UserKey.build({...keyPair, fingerprint: SHAFingerprint, userId: record.id})

          done()
        })
      })
    })
  })

  after(done => {
    db.sequelize.sync({force: true}).then(() => { done() })
  })

  it('successfully builds and instance of the model', () => {
    expect(userKey).to.exist
  })

  it('save user key correctly', done => {
    userKey.save().then(record => {
      expect(record.backupKey).to.equal(data.backupKey)
      expect(record.privateKey).to.equal(data.privateKey)
      expect(record.publicKey).to.equal(data.publicKey)
      expect(record.fingerprint).to.equal(data.SHAFingerprint)
      expect(record.userId).to.equal(user.id)

      done()
    }).catch(error => {
      expect(error).to.not.exist

      done()
    })
  })

  it('throws an error with not null violation', done => {
    user.createUserKey(data).then(record => {
      expect(record).to.not.exist
    }).catch(error => {
      expect(error.message).to.equal('notNull Violation: UserKey.fingerprint cannot be null')

      done()
    })
  })

  it('throws an error when user id does not belong to an active user', done => {
    const {SHAFingerprint, ...keyPair} = data

    UserKey.create({...keyPair, fingerprint: SHAFingerprint, userId: uuidV4()}).then(record => {
      expect(record).to.not.exist

      done()
    }).catch(error => {
      expect(error.message).to.equal('insert or update on table "UserKeys" violates foreign key constraint "UserKeys_userId_fkey"')

      done()
    })
  })
})
