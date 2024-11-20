import {expect} from 'chai'
import {v4 as uuidV4} from 'uuid'

import db from '../../../src/db/models'
import DataService from '../../../src/app/services/DataService'
import * as roleNames from '../../../src/config/roles'

const Role = db.Role

const service = new DataService(Role)

let role

describe('DataService:', () => {
  before(done => {
    Role.sync({force: true}).then(() => done())
  })

  after(done => {
    Role.sync({force: true}).then(() => done())
  })

  describe('#create', () => {
    it('creates specified record successfully', done => {
      service.create({name: roleNames.USER}).then(([userRole]) => {
        role = userRole

        expect(userRole.name).to.equal(roleNames.USER)

        done()
      })
    })
  })

  describe('#show', () => {
    it('returns the correct record', done => {
      service.show({id: role.id}).then(userRole => {
        expect(userRole.name).to.equal(roleNames.USER)

        done()
      })
    })

    it('returns empty with an invalid id', done => {
      service.show({id: uuidV4()}, {}).then(data => {
        expect(data).to.not.exist

        done()
      })
    })
  })

  describe('#index', () => {
    it('returns all record for the specified model', done => {
      service.index().then(records => {
        expect(records).to.have.length(1)

        done()
      })
    })

    it('returns all record and count for the specified model when paginated', done => {
      service.index({}, true).then(records => {
        expect(records.count).to.equal(1)
        expect(records.rows).to.have.length(1)

        done()
      })
    })
  })

  describe('#update', () => {
    it('updates record successfully', done => {
      service.update(role.id, {name: roleNames.ADMIN}).then(updated => {
        expect(updated.name).to.equal(roleNames.ADMIN)

        done()
      })
    })

    it('throws an error with invalid id', done => {
      service.update(uuidV4(), {name: roleNames.ADMIN}).then(updated => {
        expect(updated).to.not.exist

        done()
      }).catch(error => {
        expect(error.message).to.equal("Cannot read properties of null (reading 'update')")
        expect(error.name).to.equal('TypeError')

        done()
      })
    })
  })

  describe('#destroy', () => {
    it('returns the number of records removed from database', done => {
      service.destroy(role.id).then(count => {
        expect(count).to.equal(1)

        done()
      })
    })

    it('returns zero when id does not exist', done => {
      service.destroy(uuidV4()).then(count => {
        expect(count).to.equal(0)

        done()
      })
    })
  })
})
