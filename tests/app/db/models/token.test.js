import {expect} from 'chai'
import {v4 as uuidV4} from 'uuid'

import db from '../../../../src/db/models'
import {create} from '../../../fixtures'
import {fakeUser} from '../../../fixtures/users'

const Token = db.Token

let token
let user

describe('Token Model:', () => {
  before(done => {
    db.sequelize.sync({force: true}).then(() => {
      create({type: 'users', data: fakeUser}).then(([record]) => {
        token = Token.build({value: 's1st3r', userId: record.id})
        user = record

        done()
      })
    })
  })

  after(done => {
    db.sequelize.sync({force: true}).then(() => { done() })
  })

  it('creates an instance of token', () => {
    expect(token).to.exist
  })

  it('saves record successfully', done => {
    token.save().then(record => {
      expect(record.value).to.equal('s1st3r')
      expect(record.userId).to.equal(user.id)

      done()
    })
  })

  it('throws an error is value is missing', done => {
    Token.create({userId: user.id}).then(record => {
      expect(record).to.not.exist

      done()
    }).catch(error => {
      expect(error.message).to.equal('notNull Violation: Token.value cannot be null')

      done()
    })
  })

  it('throws an error is user does not exist', () => {
    Token.create({value: 'T3st3r', userId: uuidV4()}).then(record => {
      expect(record).to.not.exist

      done()
    }).catch(error => {
      expect(error.message).to.equal('insert or update on table "Tokens" violates foreign key constraint "Tokens_userId_fkey"')

      done()
    })
  })
})
