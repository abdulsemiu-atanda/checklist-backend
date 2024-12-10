import bcrypt from 'bcrypt'
import {expect} from 'chai'

import {dateToISOString} from '../../../../src/util/tools'
import db from '../../../../src/db/models'
import * as roleNames from '../../../../src/config/roles'
import {fakeUser as attributes} from '../../../fixtures'
import {smtpStub} from '../../../testHelpers'

const Role = db.Role
const User = db.User

let role
let user

describe('User Model:', () => {
  before(done => {
    db.sequelize.sync({force: true}).then(() => {
      Role.create({name: roleNames.ADMIN}).then(data => {
        role = data
        user = User.build({...attributes, RoleId: role.id})

        done()
      })
    })
  })

  after(done => {
    db.sequelize.sync({force: true}).then(() => done())
  })

  it('creates and instance of the user model', () => {
    expect(user).to.exist
  })

  it('saves user record correctly', done => {
    user.save().then(record => {
      expect(record.firstName).to.equal(attributes.firstName)
      expect(record.lastName).to.equal(attributes.lastName)
      expect(record.email).to.equal(attributes.email.toLowerCase())
      expect(record.RoleId).to.equal(role.id)
      expect(bcrypt.compareSync(attributes.password, record.password)).to.equal(true)
      expect(record.confirmed).to.equal(false)
      expect(smtpStub.called).to.equal(true)

      done()
    })
  })

  it('returns correct value for confirmed user', done => {
    user.update({confirmedAt: dateToISOString(Date.now())}).then(updated => {
      expect(updated.confirmed).to.equal(true)

      done()
    })
  })

  it('does not create user with existing email', done => {
    User.create({...attributes, RoleId: role.id}).then(record => {
      expect(record).to.not.exist

      done()
    }).catch(({errors}) => {
      const [error] = errors

      expect(error.message).to.equal('emailDigest must be unique')

      done()
    })
  })

  it('does not create a user without a role', done => {
    User.create(attributes).then(record => {
      expect(record).to.not.exist

      done()
    }).catch(({errors}) => {
      const [error] = errors

      expect(error.message).to.equal('User.RoleId cannot be null')

      done()
    })
  })
})
