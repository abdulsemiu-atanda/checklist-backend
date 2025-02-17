import {expect} from 'chai'
import request from 'supertest'
import * as OtpAuth from 'otpauth'

import app from '../../../src/app'
import db from '../../../src/db/models'

import {adminUser, fakeUser} from '../../fixtures/users'
import {create} from '../../fixtures'
import {totp} from '../../tools'

import {ADMIN} from '../../../src/config/roles'
import {CREATED, OK, UNAUTHORIZED, UNPROCESSABLE} from '../../../src/app/constants/statusCodes'
import {ACTIVE, DISABLED, INITIAL} from '../../../src/config/tfaStatuses'
import {INCOMPLETE_REQUEST, UNPROCESSABLE_REQUEST} from '../../../src/app/constants/messages'

const otp = totp(fakeUser)

let adminToken
let backupCode
let preAuthToken
let userToken
let tfaConfig
let initialized

describe('TfaConfigs Controller:', () => {
  before(done => {
    db.sequelize.sync({force: true}).then(() => {
      create({type: 'users', data: fakeUser}).then(([user]) => {
        user.createTfaConfig({url: otp.toString()}).then(record => {
          tfaConfig = record

          create({type: 'users', trait: ADMIN}).then(() => {
            request(app)
              .post('/api/auth/sign-in').send(fakeUser)
              .end((_error, response) => {
                userToken = response.body.token

                request(app)
                  .post('/api/auth/sign-in').send(adminUser)
                  .end((_, apiResponse) => {
                    preAuthToken = apiResponse.body.preAuthToken

                    done()
                  })
              })
          })
        })
      })
    })
  })

  after(done => {
    db.sequelize.sync({force: true}).then(() => { done() })
  })

  describe('POST /api/tfa-configs', () => {
    it('returns an error for unauthenticated requests', done => {
      request(app)
        .post('/api/tfa-configs').send({})
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(UNPROCESSABLE)
          expect(response.body.message).to.equal(UNPROCESSABLE_REQUEST)

          done()
        })
    })

    it('returns existing tfa config if user already started', done => {
      request(app)
        .post('/api/tfa-configs').send({})
        .set('Authorization', userToken)
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(CREATED)
          expect(response.body.data.id).to.equal(tfaConfig.id)
          expect(response.body.data.status).to.equal(INITIAL)

          done()
        })
    })

    it('creates tfa config with valid pre auth token', done => {
      request(app)
        .post('/api/tfa-configs').send({})
        .set('Authorization', preAuthToken)
        .end((error, response) => {
          initialized = response.body.data

          expect(error).to.not.exist
          expect(response.statusCode).to.equal(CREATED)
          expect(response.body.data.id).to.not.equal(tfaConfig.id)
          expect(response.body.data.status).to.equal(INITIAL)

          done()
        })
    })
  })

  describe('PATCH /api/tfa-configs/:id', () => {
    it('returns an error if activation code is invalid', done => {
      request(app)
        .patch(`/api/tfa-configs/${tfaConfig.id}`).send({activate: {code: '123456'}})
        .set('Authorization', userToken)
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(UNAUTHORIZED)
          expect(response.body.message).to.equal(INCOMPLETE_REQUEST)

          done()
        })
    })

    it('successfully activates tfa with a valid code', done => {
      request(app)
        .patch(`/api/tfa-configs/${tfaConfig.id}`).send({activate: {code: otp.generate()}})
        .set('Authorization', userToken)
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(OK)
          expect(response.body.data.id).to.equal(tfaConfig.id)
          expect(response.body.data.status).to.equal(ACTIVE)
          expect(response.body.data.backupCode).to.have.length(16)

          done()
        })
    })
  })

  describe('PUT /api/tfa-configs/:id', () => {
    it('successfully activates tfa with pre auth token', done => {
      const tfa = OtpAuth.URI.parse(initialized.url)

      request(app)
        .put(`/api/tfa-configs/${initialized.id}`).send({activate: {code: tfa.generate()}})
        .set('Authorization', preAuthToken)
        .end((error, response) => {
          adminToken = response.body.token
          backupCode = response.body.data.backupCode

          expect(error).to.not.exist
          expect(response.statusCode).to.equal(OK)
          expect(response.body.token).to.exist
          expect(response.body.refreshToken).to.exist
          expect(response.body.data.id).to.equal(initialized.id)
          expect(response.body.data.status).to.equal(ACTIVE)
          expect(response.body.data.backupCode).to.have.length(16)

          done()
        })
    })

    it('update tfa config correctly', done => {
      request(app)
        .put(`/api/tfa-configs/${initialized.id}`).send({backupCode, status: ACTIVE})
        .set('Authorization', adminToken)
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(OK)
          expect(response.body.data.id).to.equal(initialized.id)
          expect(response.body.data.status).to.equal(ACTIVE)
          expect(response.body.data.backupCode).to.exist
          expect(response.body.data.backupCode).to.not.equal(backupCode)

          done()
        })
    })

    it('reinitializes tfa config if it is disabled', done => {
      tfaConfig.update({url: null, status: DISABLED, backupCode: null}).then(() => {
        request(app)
          .post('/api/tfa-configs').send({})
          .set('Authorization', userToken)
          .end((error, response) => {
            expect(error).to.not.exist
            expect(response.statusCode).to.equal(CREATED)
            expect(response.body.data.id).to.equal(tfaConfig.id)
            expect(response.body.data.status).to.equal(INITIAL)

            done()
          })
      })
    })

    it('returns error if no payload is specified', done => {
      request(app)
        .put(`/api/tfa-configs/${initialized.id}`).send({})
        .set('Authorization', adminToken)
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(UNPROCESSABLE)
          expect(response.body.message).to.equal(UNPROCESSABLE_REQUEST)

          done()
        })
    })
  })
})
