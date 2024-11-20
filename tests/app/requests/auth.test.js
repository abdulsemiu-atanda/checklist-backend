import {expect} from 'chai'
import request from 'supertest'

import app from '../../../src/app'
import DataService from '../../../src/app/services/DataService'
import db from '../../../src/db/models'
import {USER} from '../../../src/config/roles'
import {fakeUser} from '../../fixtures'
import {BAD_REQUEST, CONFLICT, CREATED, OK, UNAUTHORIZED, UNPROCESSABLE} from '../../../src/app/constants/statusCodes'

const role = new DataService(db.Role)

let userRole

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
          expect(response.body.message).to.equal('Invalid Email')

          done()
        })
    })

    it('return unprocessable if user role does not exist', done => {
      request(app)
        .post('/api/auth/sign-up').send(fakeUser)
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(UNPROCESSABLE)
          expect(response.body.message).to.equal('Unable to process request. Please try again later.')

          done()
        })
    })

    it('creates user successfully with correct attributes', done => {
      role.create({name: USER}).then(([record]) => {
        userRole = record

        request(app)
          .post('/api/auth/sign-up').send(fakeUser)
          .end((error, response) => {
            expect(error).to.not.exist
            expect(response.statusCode).to.equal(CREATED)
            expect(response.body.message).to.equal('User successfully created.')
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
          expect(response.body.message).to.equal('Unable to complete request.')

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
          expect(response.body.message).to.equal('Email and/or password incorrect')

          done()
        })
    })

    it('returns an error if account with email does not exist', done => {
      request(app)
        .post('/api/auth/sign-in').send({...fakeUser, email: 'test@example.com'})
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(UNAUTHORIZED)
          expect(response.body.message).to.equal('Email and/or password incorrect')

          done()
        })
    })

    it('returns an error if password is incorrect', done => {
      request(app)
        .post('/api/auth/sign-in').send({...fakeUser, password: 'testing12'})
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(UNAUTHORIZED)
          expect(response.body.message).to.equal('Email and/or password incorrect')

          done()
        })
    })

    it('returns an error if password is incorrect', done => {
      request(app)
        .post('/api/auth/sign-in').send({...fakeUser, password: 'testing12'})
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(UNAUTHORIZED)
          expect(response.body.message).to.equal('Email and/or password incorrect')

          done()
        })
    })

    it('logins in with correct credentials', done => {
      request(app)
        .post('/api/auth/sign-in').send(fakeUser)
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(OK)
          expect(response.body.message).to.equal('Login Successful')
          expect(response.body.user.email).to.equal(fakeUser.email.toLowerCase())
          expect(response.body.user.firstName).to.equal(fakeUser.firstName)
          expect(response.body.user.lastName).to.equal(fakeUser.lastName)

          done()
        })
    })
  })
})
