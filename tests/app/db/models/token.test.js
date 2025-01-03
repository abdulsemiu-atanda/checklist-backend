import {expect} from 'chai'
import {v4 as uuidV4} from 'uuid'
import {fakerYO_NG as faker} from '@faker-js/faker'

import db from '../../../../src/db/models'
import {create} from '../../../fixtures'
import {fakeUser} from '../../../fixtures/users'
import logger from '../../../../src/app/constants/logger'
import {PASSWORD, SHARING} from '../../../../src/config/tokens'

const Token = db.Token
const Invite = db.Invite
const invite = {email: faker.internet.email(), firstName: faker.person.firstName(), lastName: faker.person.lastName()}

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
      token = record

      expect(record.value).to.equal('s1st3r')
      expect(record.userId).to.equal(user.id)
      expect(record.type).to.equal(PASSWORD)
      expect(record.tokenableId).to.not.exist
      expect(record.tokenableType).to.not.exist

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

  describe('associations', () => {
    it('creates invite token and invite successfully', done => {
      Token.create({
        value: 'T3st3r',
        userId: user.id,
        type: SHARING,
        Invite: invite
      }, {include: Invite}).then(record => {
        expect(record.Invite.email).to.equal(invite.email.toLowerCase())
        expect(record.Invite.firstName).to.equal(invite.firstName)
        expect(record.Invite.lastName).to.equal(invite.lastName)
        expect(record.tokenableId).to.equal(record.Invite.id)
        expect(record.tokenableType).to.equal('Invite')
        expect(record.type).to.equal(SHARING)
        expect(record.tokenableId).to.not.equal(user.id)

        done()
      }).catch(error => {
        logger.info(error.message)

        done()
      })
    })

    describe('polymorphic', () => {
      it('adds invite tokenable when association is included', done => {
        Token.findOne({where: {value: 'T3st3r'}, include: {model: Invite, as: 'Lead'}}).then(record => {
          expect(record.tokenable.email).to.equal(invite.email.toLowerCase())

          done()
        })
      })

      it('adds user tokenable when association is included', done => {
        token.update({tokenableId: user.id, tokenableType: 'User'}).then(updated => {
          Token.findOne({where: {id: updated.id}, include: {model: db.User, as: 'Collaborator'}}).then(record => {
            expect(record.tokenable.id).to.equal(user.id)

            done()
          })
        })
      })
    })
  })
})
