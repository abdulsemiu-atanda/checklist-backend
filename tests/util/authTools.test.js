import {expect} from 'chai'
import {v4 as uuidV4} from 'uuid'

import db from '../../src/db/models'
import {create} from '../fixtures'

import * as authTools from '../../src/util/authTools'

let token
let adminUser
let user

const id = uuidV4()
const roleId = uuidV4()

describe('authTools:', () => {
  before(done => {
    db.sequelize.sync({force: true}).then(() => {
      create({type: 'users', trait: 'admin'}).then(([record]) => {
        adminUser = record

        create({type: 'users'}).then(([data]) => {
          user = data

          done()
        })
      })
    })
  })

  after(done => {
    db.sequelize.sync({force: true}).then(() => { done() })
  })

  describe('#userToken', () => {
    it('creates a token with the specified payload', () => {
      token = authTools.userToken({id, roleId}, '5m')

      expect(token).to.exist
    })
  })

  describe('#verifyToken', () => {
    it('decodes data correctly', () => {
      const decoded = authTools.verifyToken(token)

      expect(decoded.id).to.equal(id)
      expect(decoded.roleId).to.equal(roleId)
      expect(Date.now() >= decoded.exp * 1000).to.equal(false)
    })
  })

  describe('#generateCode', () => {
    it('returns randomized number with default size if size is not specified', () => {
      expect(authTools.generateCode()).to.have.length(6)
    })

    it('returns number of specified size', () => {
      expect(authTools.generateCode(8)).to.have.length(8)
    })
  })

  describe('#isAdmin', () => {
    it('returns true if user is an admin', done => {
      authTools.isAdmin(adminUser).then(data => {
        expect(data).to.equal(true)

        done()
      }).catch(error => {
        expect(error).to.not.exist

        done()
      })
    })

    it('returns false if user is not an admin', done => {
      authTools.isAdmin(user).then(data => {
        expect(data).to.equal(false)

        done()
      }).catch(error => {
        expect(error).to.not.exist

        done()
      })
    })

    it('returns false if user role is invalid', done => {
      authTools.isAdmin({roleId}).then(data => {
        expect(data).to.equal(false)

        done()
      }).catch(error => {
        expect(error).to.not.exist

        done()
      })
    })
  })
})
