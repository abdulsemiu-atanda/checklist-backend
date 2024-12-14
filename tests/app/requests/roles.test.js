import {expect} from 'chai'
import request from 'supertest'

import app from '../../../src/app'
import DataService from '../../../src/app/services/DataService'
import db from '../../../src/db/models'
import {OK, UNAUTHORIZED, UNPROCESSABLE} from '../../../src/app/constants/statusCodes'
import {INCOMPLETE_REQUEST, UNPROCESSABLE_REQUEST} from '../../../src/app/constants/messages'
import {ADMIN, USER} from '../../../src/config/roles'
import {adminUser, fakeUser} from '../../fixtures'

const role = new DataService(db.Role)
const user = new DataService(db.User)

let userToken
let adminToken

describe('Roles Controller', () => {
  before(done => {
    db.sequelize.sync({force: true}).then(() => {
      role.create({name: USER}).then(([record]) => {
        user.create({...fakeUser, RoleId: record.id}).then(() => {
          request(app)
            .post('/api/auth/sign-in').send(fakeUser)
            .then((response) => {
              userToken = response.body.token

              role.create({name: ADMIN}).then(([adminRole]) => {
                user.create({...adminUser, RoleId: adminRole.id}).then(() => {
                  request(app)
                  .post('/api/auth/sign-in').send(adminUser)
                  .then((response) => {
                    adminToken = response.body.token

                    done()
                  })
                })
              })
          })
        })
      })
    })
  })

  after(done => {
    db.sequelize.sync({force: true}).then(() => {
      done()
    })
  })

  describe('GET /api/roles', () => {
    it('does not allow unauthenticated access', done => {
      request(app)
        .get('/api/roles')
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(UNPROCESSABLE)
          expect(response.body.message).to.equal(UNPROCESSABLE_REQUEST)

          done()
        })
    })

    it('does not allow non-admin user', done => {
      request(app)
        .get('/api/roles')
        .set('Authorization', userToken)
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(UNAUTHORIZED)
          expect(response.body.message).to.equal(INCOMPLETE_REQUEST)

          done()
        })
    })
  })

  describe('GET /api/roles', () => {
    it('successfully returns roles to admin user', done => {
      request(app)
      .get('/api/roles')
      .set('Authorization', adminToken)
      .end((error, response) => {
        expect(error).to.not.exist
        expect(response.statusCode).to.equal(OK)
        expect(response.body.roles).to.have.lengthOf(2)
        expect(response.body.roles.map(role => role.name)).to.deep.equal([USER, ADMIN])

        done()
      })
    })
  })
})
