import {expect} from 'chai'
import {v4 as uuidV4} from 'uuid'

import db from '../../../../src/db/models'
import {USER} from '../../../../src/config/roles'
import {fakeUser} from '../../../fixtures'
import {generateCode} from '../../../../src/util/authTools'

const Role = db.Role
const User = db.User
const Confirmation = db.Confirmation

let confirmation
let user

describe('Confirmation Model:', () => {
  before(done => {
    db.sequelize.sync({force: true}).then(() => {
      Role.create({name: USER}).then(role => {
        User.create({...fakeUser, RoleId: role.id}).then(record => {
          user = record
          confirmation = Confirmation.build({code: generateCode(), UserId: record.id})

          done()
        })
      })
    })
  })

  after(done => {
    db.sequelize.sync({force: true}).then(() => done())
  })

  it('creates an instance of confirmation', () => {
    expect(confirmation).to.exist
  })

  it('creates confirmation when user is created', done => {
    user.getConfirmation().then(record => {
      expect(record.code).to.exist
      expect(record.UserId).to.equal(user.id)

      done()
    })
  })

  it('throws an error when creating with an invalid user id', done => {
    Confirmation.create({code: generateCode(), UserId: uuidV4()}).then(record => {
      expect(record).to.not.exist

      done()
    }).catch(error => {
      expect(error.message).to.equal('insert or update on table "Confirmations" violates foreign key constraint "Confirmations_UserId_fkey"')

      done()
    })
  })
})
