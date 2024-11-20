import bcrypt from 'bcrypt'
import {expect} from 'chai'
import {fakerYO_NG} from '@faker-js/faker'

import db from '../../../../src/db/models'
import * as roleNames from '../../../../src/config/roles'

const Role = db.Role
const User = db.User

let role
let user

const attributes = {
  email: fakerYO_NG.internet.email(),
  firstName: fakerYO_NG.person.firstName(),
  lastName: fakerYO_NG.person.lastName(),
  password: fakerYO_NG.internet.password()
}

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
      expect(record.email).to.equal(attributes.email)
      expect(record.RoleId).to.equal(role.id)
      expect(bcrypt.compareSync(attributes.password, record.password)).to.equal(true)

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
})
