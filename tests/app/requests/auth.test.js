import bcrypt from 'bcrypt'
import {expect} from 'chai'
import request from 'supertest'
import {faker} from '@faker-js/faker'
import {v4 as uuidV4} from 'uuid'

import app from '../../../src/app'
import DataService from '../../../src/app/services/DataService'
import db from '../../../src/db/models'
import {digest} from '../../../src/util/cryptTools'
import {create} from '../../fixtures'
import {adminUser, fakeUser, invalidUser} from '../../fixtures/users'
import {generateCode, userToken} from '../../../src/util/authTools'
import {totp} from '../../tools'

import {ADMIN, USER} from '../../../src/config/roles'
import {
  ACCEPTED,
  BAD_REQUEST,
  CONFLICT,
  CREATED,
  OK,
  UNAUTHORIZED,
  UNPROCESSABLE
} from '../../../src/app/constants/statusCodes'
import {
  ACCOUNT_CONFIRMED,
  ACCOUNT_CREATION_SUCCESS,
  INCOMPLETE_REQUEST,
  INCORRECT_EMAIL_PASSWORD,
  INVALID_EMAIL,
  LOGIN_SUCCESS,
  UNPROCESSABLE_REQUEST
} from '../../../src/app/constants/messages'
import {ACTIVE, DISABLED} from '../../../src/config/tfaStatuses'

const role = new DataService(db.Role)
const user = new DataService(db.User)
const tfaConfig = new DataService(db.TfaConfig)

const backupCode = generateCode(16)
const code = generateCode()
const testUser = {...fakeUser, email: faker.internet.email()}
const fakeToken = userToken({id: uuidV4(), roleId: uuidV4})

let authToken
let preAuthToken
let refreshToken
let token
let data
let otp

describe('Auth Controller', () => {
  before(done => {
    db.sequelize.sync({force: true}).then(() => {
      create({type: 'users', trait: ADMIN}).then(() => {
        done()
      })
    })
  })

  after(done => {
    db.sequelize.sync({force: true}).then(() => {
      done()
    })
  })

  describe('POST /api/auth/sign-up', () => {
    it('return an error message when email format is invalid', done => {
      request(app)
        .post('/api/auth/sign-up').send({...fakeUser, email: 'test.com'})
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(BAD_REQUEST)
          expect(response.body.message).to.equal(INVALID_EMAIL)

          done()
        })
    })

    it('return unprocessable if user role does not exist', done => {
      request(app)
        .post('/api/auth/sign-up').send(fakeUser)
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(UNPROCESSABLE)
          expect(response.body.message).to.equal(UNPROCESSABLE_REQUEST)

          done()
        })
    })

    it('creates user successfully with correct attributes', done => {
      role.create({name: USER}).then(() => {
        request(app)
          .post('/api/auth/sign-up').send(fakeUser)
          .end((error, response) => {
            authToken = response.body.token

            expect(error).to.not.exist
            expect(response.statusCode).to.equal(CREATED)
            expect(response.body.message).to.equal(ACCOUNT_CREATION_SUCCESS)
            expect(response.body.token).to.exist

            done()
          })
      })
    })

    it('returns conflict when user already exists', done => {
      request(app)
        .post('/api/auth/sign-up').send(fakeUser)
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(CONFLICT)
          expect(response.body.message).to.equal(INCOMPLETE_REQUEST)

          done()
        })
    })

    it('returns unprocessable when required attribute is missing', done => {
      request(app)
        .post('/api/auth/sign-up').send(invalidUser)
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(UNPROCESSABLE)
          expect(response.body.message).to.equal(UNPROCESSABLE_REQUEST)

          done()
        })
    })
  })

  describe('POST /api/auth/sign-in', () => {
    it('returns an error if email is invalid', done => {
      request(app)
        .post('/api/auth/sign-in').send({...fakeUser, email: 'test.com'})
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(UNAUTHORIZED)
          expect(response.body.message).to.equal(INCORRECT_EMAIL_PASSWORD)

          done()
        })
    })

    it('returns an error if account with email does not exist', done => {
      request(app)
        .post('/api/auth/sign-in').send({...fakeUser, email: 'test@example.com'})
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(UNAUTHORIZED)
          expect(response.body.message).to.equal(INCORRECT_EMAIL_PASSWORD)

          done()
        })
    })

    it('returns an error if password is incorrect', done => {
      request(app)
        .post('/api/auth/sign-in').send({...fakeUser, password: 'testing12'})
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(UNAUTHORIZED)
          expect(response.body.message).to.equal(INCORRECT_EMAIL_PASSWORD)

          done()
        })
    })

    it('logins in with correct credentials', done => {
      request(app)
        .post('/api/auth/sign-in').send(fakeUser)
        .end((error, response) => {
          refreshToken = response.body.refreshToken
          data = response.body.user
          otp = totp(data)

          expect(error).to.not.exist
          expect(response.statusCode).to.equal(OK)
          expect(response.body.message).to.equal(LOGIN_SUCCESS)
          expect(response.body.user.email).to.equal(fakeUser.email.toLowerCase())
          expect(response.body.user.firstName).to.equal(fakeUser.firstName)
          expect(response.body.user.lastName).to.equal(fakeUser.lastName)
          expect(response.body.user.confirmed).to.equal(false)

          done()
        })
    })

    it('returns pre auth token is user is an admin', done => {
      request(app)
        .post('/api/auth/sign-in').send(adminUser)
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(OK)
          expect(response.body.token).to.not.exist
          expect(response.body.refreshToken).to.not.exist
          expect(response.body.preAuthToken).to.exist

          done()
        })
    })

    it('returns pre auth token when user has TFA enabled', done => {
      tfaConfig.create({
        backupCode,
        userId: data.id,
        status: ACTIVE,
        url: otp.toString()
      }).then(() => {
        request(app)
          .post('/api/auth/sign-in').send(fakeUser)
          .end((error, response) => {
            preAuthToken = response.body.preAuthToken

            expect(error).to.not.exist
            expect(response.statusCode).to.equal(OK)
            expect(response.body.token).to.not.exist
            expect(response.body.refreshToken).to.not.exist
            expect(response.body.preAuthToken).to.exist
            expect(response.body.data.userId).to.equal(data.id)

            done()
          })
      })
    })
  })

  describe('POST /api/auth/confirm', () => {
    it('returns an error when code is invalid', done => {
      request(app)
        .post('/api/auth/confirm').send({code: '123456'})
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(BAD_REQUEST)
          expect(response.body.message).to.equal(INCOMPLETE_REQUEST)

          done()
        })
    })

    it('returns unprocessable if code is not a string', done => {
      request(app)
        .post('/api/auth/confirm').send({code: 123456})
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(UNPROCESSABLE)
          expect(response.body.message).to.equal(UNPROCESSABLE_REQUEST)

          done()
        })
    })

    it('confirms the account with a valid code', done => {
      user.show({emailDigest: digest(fakeUser.email.toLowerCase())}).then(record => {
        record.getConfirmation().then(async confirmation => {
          await confirmation.update({code})

          request(app)
            .post('/api/auth/confirm').send({code})
            .end((error, response) => {
              expect(error).to.not.exist
              expect(response.statusCode).to.equal(OK)
              expect(response.body.message).to.equal(ACCOUNT_CONFIRMED)

              record.reload().then(data => {
                expect(data.confirmed).to.equal(true)

                done()
              })
            })
        })
      })
    })
  })

  describe('POST /api/auth/resend-confirmation', () => {
    it('returns an error when email is invalid', done => {
      request(app)
        .post('/api/auth/resend-confirmation').send({email: 'example.com'})
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(UNPROCESSABLE)
          expect(response.body.message).to.equal(UNPROCESSABLE_REQUEST)

          done()
        })
    })

    it('returns success if email is valid', done => {
      request(app)
        .post('/api/auth/resend-confirmation').send({email: 'test@user.com'})
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(OK)
          expect(response.body.message).to.equal('Account confirmation email sent.')

          done()
        })
    })

    it('returns success for an already confirmed user', done => {
      request(app)
        .post('/api/auth/resend-confirmation').send(fakeUser)
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(OK)
          expect(response.body.message).to.equal('Account confirmation email sent.')

          done()
        })
    })

    it('returns success for unconfirmed user', done => {
      create({type: 'users', data: testUser}).then(([record]) => {
        record.getConfirmation().then(() => { // making sure that the confirmation code transaction is completed
          request(app)
            .post('/api/auth/resend-confirmation').send(testUser)
            .end((error, response) => {
              expect(error).to.not.exist
              expect(response.statusCode).to.equal(OK)
              expect(response.body.message).to.equal('Account confirmation email sent.')

              done()
            })
        })
      })
    })
  })

  describe('POST /api/auth/reset-password', () => {
    it('returns an error if email is invalid', done => {
      request(app)
        .post('/api/auth/reset-password').send({email: 'test.com'})
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(UNPROCESSABLE)
          expect(response.body.message).to.equal(UNPROCESSABLE_REQUEST)

          done()
        })
    })

    it('return success if user does not exist', done => {
      request(app)
        .post('/api/auth/reset-password').send({email: 'test@example.com'})
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(ACCEPTED)
          expect(response.body.message).to.equal('Password reset requested.')

          done()
        })
    })

    it('returns success if user is unconfirmed', done => {
      request(app)
        .post('/api/auth/reset-password').send(testUser)
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(ACCEPTED)
          expect(response.body.message).to.equal('Password reset requested.')

          done()
        })
    })

    it('successfully sends reset email if user exists', done => {
      request(app)
        .post('/api/auth/reset-password').send(fakeUser)
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(ACCEPTED)
          expect(response.body.message).to.equal('Password reset requested.')

          done()
        })
    })
  })

  describe('GET /api/auth/validate-token/:token', () => {
    it('does not return data when token is invalid', done => {
      request(app)
        .get('/api/auth/validate-token/s1st3r')
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(OK)
          expect(response.body.data).to.not.exist

          done()
        })
    })

    it('returns token id if token is valid', done => {
      user.show({emailDigest: digest(fakeUser.email.toLowerCase())}).then(record => {
        record.getTokens().then(tokens => {
          token = tokens[0]

          request(app)
            .get(`/api/auth/validate-token/${encodeURIComponent(token.value)}`)
            .end((error, response) => {
              expect(error).to.not.exist
              expect(response.statusCode).to.equal(OK)
              expect(response.body.data).to.equal(token.id)

              done()
            })
        })
      })
    })
  })

  describe('POST /api/auth/change-password', () => {
    it('retruns unprocessable if token id is missing', done => {
      request(app)
        .post('/api/auth/change-password').send({password: 'Testing123', confirmPassword: 'Testing123'})
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(UNPROCESSABLE)
          expect(response.body.message).to.equal(UNPROCESSABLE_REQUEST)

          done()
        })
    })

    it('returns unprocessable if password is different from confirm password', done => {
      request(app)
        .post('/api/auth/change-password').send({tokenId: token.id, password: 'Testing123', confirmPassword: 'Testing124'})
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(UNPROCESSABLE)
          expect(response.body.message).to.equal(UNPROCESSABLE_REQUEST)

          done()
        })
    })

    it('successfully updates user password with the right payload', done => {
      request(app)
        .post('/api/auth/change-password').send({tokenId: token.id, password: 'Testing123', confirmPassword: 'Testing123'})
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(OK)
          expect(response.body.message).to.equal('Password reset successful.')

          user.show({emailDigest: digest(fakeUser.email.toLowerCase())}).then(record => {
            expect(bcrypt.compareSync(fakeUser.password, record.password)).to.equal(false)
            expect(bcrypt.compareSync('Testing123', record.password)).to.equal(true)

            done()
          })
        })
    })
  })

  describe('GET /api/auth/:refreshToken', () => {
    it('returns unauthorized when refresh token is forged', done => {
      request(app)
        .get(`/api/auth/${encodeURIComponent(digest(`${data.id}${data.roleId}`))}`)
        .set('Authorization', authToken)
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(UNAUTHORIZED)
          expect(response.body.message).to.equal(INCOMPLETE_REQUEST)

          done()
        })
    })

    it('successfully refreshes authentication token', done => {
      request(app)
        .get(`/api/auth/${refreshToken}`)
        .set('Authorization', authToken)
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(OK)
          expect(response.body.token).to.exist
          expect(response.body.message).to.equal('Session extended successfully.')

          done()
        })
    })
  })

  describe('GET /api/auth/logout', () => {
    it('returns unprocessable for unauthenticated request', done => {
      request(app)
        .get('/api/auth/logout')
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(UNPROCESSABLE)
          expect(response.body.message).to.equal(UNPROCESSABLE_REQUEST)

          done()
        })
    })

    it('returns unprocessable for fake token', done => {
      request(app)
        .get('/api/auth/logout')
        .set('Authorization', fakeToken)
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(UNPROCESSABLE)
          expect(response.body.message).to.equal(UNPROCESSABLE_REQUEST)

          done()
        })
    })

    it('successfully logout with a valid token', done => {
      request(app)
        .get('/api/auth/logout')
        .set('Authorization', authToken)
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(ACCEPTED)
          expect(response.body.message).to.equal('Logout Successful.')

          done()
        })
    })
  })

  describe('POST /api/auth/tfa-login', () => {
    it('returns an error if tfa code is invalid', done => {
      request(app)
        .post('/api/auth/tfa-login').send({code: '123456'})
        .set('Authorization', preAuthToken)
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(UNAUTHORIZED)
          expect(response.body.message).to.equal(INCOMPLETE_REQUEST)

          done()
        })
    })

    it('throws an error if pre auth token is invalid', done => {
      request(app)
        .post('/api/auth/tfa-login').send({code: otp.generate()})
        .set('Authorization', digest('123456'))
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(UNAUTHORIZED)
          expect(response.body.message).to.equal(INCOMPLETE_REQUEST)

          done()
        })
    })

    it('throws an error if pre auth token is not specified', done => {
      request(app)
        .post('/api/auth/tfa-login').send({code: otp.generate()})
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(UNPROCESSABLE)
          expect(response.body.message).to.equal(UNPROCESSABLE_REQUEST)

          done()
        })
    })

    it('successfully logs in user with valid tfa code', done => {
      request(app)
        .post('/api/auth/tfa-login').send({code: otp.generate()})
        .set('Authorization', preAuthToken)
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(OK)
          expect(response.body.user.id).to.equal(data.id)
          expect(response.body.token).to.exist
          expect(response.body.refreshToken).to.exist

          done()
        })
    })

    it('successfully logs in with backup code and disables tfa', done => {
      request(app)
        .post('/api/auth/tfa-login').send({backupCode})
        .set('Authorization', preAuthToken)
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(OK)
          expect(response.body.user.id).to.equal(data.id)
          expect(response.body.token).to.exist
          expect(response.body.refreshToken).to.exist

          tfaConfig.show({userId: data.id}).then(record => {
            expect(record.status).to.equal(DISABLED)
            expect(record.url).to.equal(null)
            expect(record.backupCode).to.equal(null)

            done()
          }).catch(() => { done() })
        })
    })

    it('returns an error if tfa config is not active', done => {
      request(app)
        .post('/api/auth/tfa-login').send({code: otp.generate()})
        .set('Authorization', preAuthToken)
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(UNAUTHORIZED)
          expect(response.body.message).to.equal(INCOMPLETE_REQUEST)

          done()
        })
    })
  })
})
