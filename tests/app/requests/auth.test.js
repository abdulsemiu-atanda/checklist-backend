import bcrypt from 'bcrypt'
import {expect} from 'chai'
import request from 'supertest'
import {faker} from '@faker-js/faker'

import app from '../../../src/app'
import DataService from '../../../src/app/services/DataService'
import db from '../../../src/db/models'
import {digest} from '../../../src/util/cryptTools'
import {create} from '../../fixtures'
import {fakeUser, invalidUser} from '../../fixtures/users'
import {generateCode} from '../../../src/util/authTools'
import {smtpStub} from '../../testHelpers'

import {USER} from '../../../src/config/roles'
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

const role = new DataService(db.Role)
const user = new DataService(db.User)

const code = generateCode()
const testUser = {...fakeUser, email: faker.internet.email()}

let token

describe('Auth Controller', () => {
  before(done => {
    db.sequelize.sync({force: true}).then(() => {
      done()
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
      create({type: 'users', data: testUser}).then(() => {
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
          expect(smtpStub.called).to.equal(false)

          done()
        })
    })

    it('successfully sends reset email if user exists', done => {
      request(app)
        .post('/api/auth/reset-password').send(testUser)
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(ACCEPTED)
          expect(response.body.message).to.equal('Password reset requested.')
          expect(smtpStub.called).to.equal(true)

          done()
        })
    })
  })

  describe('GET /api/auth/validate-reset-token/:token', () => {
    it('does not return data when token is invalid', done => {
      request(app)
        .get('/api/auth/validate-reset-token/s1st3r')
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(OK)
          expect(response.body.data).to.not.exist

          done()
        })
    })

    it('returns token id if token is valid', done => {
      user.show({emailDigest: digest(testUser.email.toLowerCase())}).then(record => {
        record.getTokens().then(tokens => {
          token = tokens[0]

          request(app)
            .get(`/api/auth/validate-reset-token/${encodeURIComponent(token.value)}`)
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

          user.show({emailDigest: digest(testUser.email.toLowerCase())}).then(record => {
            expect(bcrypt.compareSync(testUser.password, record.password)).to.equal(false)
            expect(bcrypt.compareSync('Testing123', record.password)).to.equal(true)

            done()
          })
        })
    })
  })
})
