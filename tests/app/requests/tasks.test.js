import {expect} from 'chai'
import request from 'supertest'
import {fakerYO_NG as faker} from '@faker-js/faker'
import {v4 as uuidV4} from 'uuid'

import app from '../../../src/app'
import db from '../../../src/db/models'
import {fakeUser} from '../../fixtures/users'
import {fakeInvite, collaborator as invitee} from '../../fixtures/invites'
import {create, setupTaskCollaboration} from '../../fixtures'

import {ACCEPTED, CREATED, NOT_FOUND, OK, UNAUTHORIZED, UNPROCESSABLE} from '../../../src/app/constants/statusCodes'
import {INCOMPLETE_REQUEST, RECORD_NOT_FOUND, UNPROCESSABLE_REQUEST } from '../../../src/app/constants/messages'
import {STARTED} from '../../../src/config/tasks'
import {EDIT} from '../../../src/config/permissions'

let authToken
let collaboratorToken
let userToken
let user
let data
let autreTask

const task = {title: faker.book.title(), description: faker.lorem.paragraph(4)}
const collaborator = {...fakeUser, email: faker.internet.email()}

describe('Tasks Controller:', () => {
  before(done => {
    db.sequelize.sync({force: true}).then(() => {
      create({type: 'users', data: fakeUser, trait: 'withUserKey'}).then(([record]) => {
        user = record

        request(app)
          .post('/api/auth/sign-in').send(fakeUser)
          .end((_error, response) => {
            userToken = response.body.token

            done()
          })
      })
    })
  })

  after(done => {
    db.sequelize.sync({force: true}).then(() => { done() })
  })

  describe('POST /api/tasks', () => {
    it('creates task with default status', done => {
      request(app)
        .post('/api/tasks').send(task)
        .set('Authorization', userToken)
        .end((error, response) => {
          data = response.body.data

          expect(error).to.not.exist
          expect(response.statusCode).to.equal(CREATED)
          expect(response.body.data.status).to.equal('created')
          expect(response.body.data.title).to.equal(task.title)
          expect(response.body.data.description).to.equal(task.description)
          expect(response.body.data.userId).to.equal(user.id)

          done()
        })

    })
  })

  describe('GET /api/tasks', () => {
    it('returns all tasks associated to user', done => {
      request(app)
        .get('/api/tasks')
        .set('Authorization', userToken)
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(OK)
          expect(response.body.data).to.have.length(1)
          expect(response.body.data[0].id).to.equal(data.id)
          expect(response.body.data[0].Permissions).to.not.exist

          done()
        })
    })

    it('eager loads when specified', done => {
      request(app)
        .get('/api/tasks?include=permissions.invite,permissions.user')
        .set('Authorization', userToken)
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(OK)
          expect(response.body.data).to.have.length(1)
          expect(response.body.data[0].id).to.equal(data.id)
          expect(response.body.data[0].Permissions).to.have.length(0)

          done()
        })
    })

    it('returns shared task to collaborator', done => {
      setupTaskCollaboration({inviter: fakeUser, invitee, permissionType: EDIT}).then(record => {
        autreTask = record

        request(app)
          .post('/api/auth/sign-in').send(invitee)
          .end((error, response) => {
            collaboratorToken = response.body.token

            expect(error).to.not.exist

            request(app)
              .get('/api/tasks?include=permissions.invite,permissions.user')
              .set('Authorization', response.body.token)
              .end((innerError, response) => {
                expect(innerError).to.not.exist
                expect(response.statusCode).to.equal(OK)
                expect(response.body.data).to.have.length(1)
                expect(response.body.data[0].id).to.equal(autreTask.id)
                expect(response.body.data[0].Permissions).to.not.exist

                done()
              })
          })
      })
    })
  })

  describe('GET /api/tasks/:id', () => {
    it('return specified task to owner', done => {
      request(app)
        .get(`/api/tasks/${data.id}`)
        .set('Authorization', userToken)
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(OK)
          expect(response.body.data.id).to.equal(data.id)
          expect(response.body.data.title).to.equal(task.title)

          done()
        })
    })

    it('returns unprocessable is task does not belong to user', done => {
      create({type: 'users', data: collaborator}).then(() => {
        request(app)
          .post('/api/auth/sign-in').send(collaborator)
          .end((_error, res) => {
            authToken = res.body.token

            request(app)
            .get(`/api/tasks/${data.id}`)
            .set('Authorization', authToken)
            .end((error, response) => {
              expect(error).to.not.exist
              expect(response.statusCode).to.equal(UNAUTHORIZED)
              expect(response.body.message).to.equal(INCOMPLETE_REQUEST)

              done()
            })
          })
      })
    })

    it('returns not found if task id is invalid', done => {
      request(app)
        .get(`/api/tasks/${uuidV4()}`)
        .set('Authorization', userToken)
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(NOT_FOUND)
          expect(response.body.message).to.equal(RECORD_NOT_FOUND)

          done()
        })
    })
  })

  describe('PUT /api/tasks/:id', () => {
    it('updates task correctly', done => {
      request(app)
        .put(`/api/tasks/${data.id}`).send({title: 'Faire du shopping', status: STARTED})
        .set('Authorization', userToken)
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(OK)
          expect(response.body.data.title).to.equal('Faire du shopping')
          expect(response.body.data.status).to.equal(STARTED)

          done()
        })
    })

    it('return unprocessable if collaborator tries to update task', done => {
      request(app)
        .put(`/api/tasks/${data.id}`).send({title: 'Faire du shopping', status: STARTED})
        .set('Authorization', authToken)
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(UNAUTHORIZED)
          expect(response.body.message).to.equal(INCOMPLETE_REQUEST)

          done()
        })
    })
  })

  describe('PATCH /api/tasks/:id', () => {
    it('updates task correctly', done => {
      request(app)
        .patch(`/api/tasks/${data.id}`).send({status: 'created'})
        .set('Authorization', userToken)
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(OK)
          expect(response.body.data.status).to.equal('created')

          done()
        })
    })

    describe('collaboration', () => {
      it('return unprocessable if task id is invalid', done => {
        request(app)
          .patch(`/api/tasks/${uuidV4()}`).send({status: STARTED})
          .set('Authorization', authToken)
          .end((error, response) => {
            expect(error).to.not.exist
            expect(response.statusCode).to.equal(UNAUTHORIZED)
            expect(response.body.message).to.equal(INCOMPLETE_REQUEST)

            done()
          })
      })

      it('return unprocessable if non collaborator tries to update task', done => {
        request(app)
          .patch(`/api/tasks/${data.id}`).send({status: STARTED})
          .set('Authorization', authToken)
          .end((error, response) => {
            expect(error).to.not.exist
            expect(response.statusCode).to.equal(UNAUTHORIZED)
            expect(response.body.message).to.equal(INCOMPLETE_REQUEST)

            done()
          })
      })

      it('allows user with edit permission edit shared task', done => {
        request(app)
          .patch(`/api/tasks/${autreTask.id}`).send({status: 'started'})
          .set('Authorization', collaboratorToken)
          .end((error, res) => {
            expect(error).to.not.exist
            expect(res.statusCode).to.equal(OK)
            expect(res.body.data.status).to.equal('started')

            done()
          })
      })
    })
  })

  describe('DELETE /api/tasks/:id', () => {
    it('does not allow collaborators to delete task', done => {
      request(app)
        .delete(`/api/tasks/${data.id}`)
        .set('Authorization', authToken)
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(UNAUTHORIZED)
          expect(response.body.message).to.equal(INCOMPLETE_REQUEST)

          done()
        })
    })

    it('allows owner destroy task', done => {
      request(app)
        .delete(`/api/tasks/${data.id}`)
        .set('Authorization', userToken)
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(ACCEPTED)
          expect(response.body.message).to.equal('Record deleted')

          done()
        })
    })
  })

  describe('POST /api/tasks/:id/invites', () => {
    it('does not attempt to create task invite existing collaborator', done => {
      request(app)
        .post(`/api/tasks/${autreTask.id}/invites`).send({invite: invitee})
        .set('Authorization', userToken)
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(ACCEPTED)
          expect(response.body.message).to.equal('Collaboration invite created')

          done()
        })
    })

    it('successfully invites new collaborator', done => {
      request(app)
        .post(`/api/tasks/${autreTask.id}/invites`).send({invite: fakeInvite})
        .set('Authorization', userToken)
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(ACCEPTED)
          expect(response.body.data.email).to.equal(fakeInvite.email.toLowerCase())
          expect(response.body.data.firstName).to.equal(fakeInvite.firstName)
          expect(response.body.data.lastName).to.equal(fakeInvite.lastName)
          expect(response.body.message).to.equal('Collaboration invite created')

          done()
        })
    })

    it('returns an error if user does not have a user key', done => {
      user.getUserKey().then(userKey => {
        userKey.destroy().then(() => {
          request(app)
            .post(`/api/tasks/${autreTask.id}/invites`).send({invite: {...fakeInvite, email: faker.internet.email()}})
            .set('Authorization', userToken)
            .end((error, response) => {
              expect(error).to.not.exist
              expect(response.statusCode).to.equal(UNPROCESSABLE)
              expect(response.body.message).to.equal(UNPROCESSABLE_REQUEST)

              done()
            })
        })
      })
    })
  })
})
