import {expect} from 'chai'
import request from 'supertest'

import app from '../../../src/app'
import db from '../../../src/db/models'
import {seedRecords, create} from '../../fixtures'
import {fakeUser, adminUser} from '../../fixtures/users'

import {ADMIN, USER} from '../../../src/config/roles'
import {OK, UNPROCESSABLE} from '../../../src/app/constants/statusCodes'
import {UNPROCESSABLE_REQUEST} from '../../../src/app/constants/messages'

let adminToken
let userToken

describe('Users Controller', () => {
  before(done => {
    db.sequelize.sync({force: true}).then(() => {
      create({type: 'users', trait: ADMIN}).then(() => {
        create({type: 'users', trait: USER, data: fakeUser}).then(() => {
          seedRecords({count: 10, type: 'users'}).then(() => {
            request(app)
              .post('/api/auth/sign-in').send(fakeUser)
              .then(response => {
                userToken = response.body.token

                request(app)
                  .post('/api/auth/sign-in').send(adminUser)
                  .then(response => {
                    adminToken = response.body.token

                    done()
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

  describe('GET /api/users', () => {
    it('returns an error for unauthenticated request', done => {
      request(app)
        .get('/api/users')
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(UNPROCESSABLE)
          expect(response.body.message).to.equal(UNPROCESSABLE_REQUEST)

          done()
        })
    })

    it('returns only the current user to non-admin', done => {
      request(app)
        .get('/api/users')
        .set('Authorization', userToken)
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(OK)
          expect(response.body.data).to.have.lengthOf(1)
          expect(response.body.data[0].email).to.equal(fakeUser.email.toLowerCase())

          done()
        })
    })

    it('returns all users to admin users', done => {
      request(app)
        .get('/api/users')
        .set('Authorization', adminToken)
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(OK)
          console.log(response.body.data)
          expect(response.body.data).to.have.lengthOf(12)
          expect(response.body.data[0].RoleId).to.exist

          done()
        })
    })
  })
})