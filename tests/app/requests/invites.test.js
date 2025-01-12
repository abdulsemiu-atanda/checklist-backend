import {expect} from 'chai'
import request from 'supertest'
import {v4 as uuidV4} from 'uuid'

import app from '../../../src/app'
import db from '../../../src/db/models'
import {collaborator, fakeInvite} from '../../fixtures/invites'
import {fakeUser} from '../../fixtures/users'
import {setupTaskCollaboration} from '../../fixtures'
import logger from '../../../src/app/constants/logger'
import {smtpStub} from '../../testHelpers'

import {ACCEPTED, CREATED, OK} from '../../../src/app/constants/statusCodes'
import {digest, generateKeyPair} from '../../../src/util/cryptTools'

const Invite = db.Invite
const Token = db.Token
const User = db.User
const UserKey = db.UserKey

let collaboratorToken
let existingUserInvite
let existingUserToken
let invite
let userToken
let task

describe('Invites Controller', () => {
  before(done => {
    db.sequelize.sync({force: true}).then(() => {
      setupTaskCollaboration({inviter: fakeUser, invitee: collaborator}).then(record => {
        task = record

        Promise.all([
          request(app).post('/api/auth/sign-in').send(fakeUser),
          request(app).post('/api/auth/sign-in').send(collaborator)
        ]).then(([userRespone, collaboratorResponse]) => {
          userToken = userRespone.body.token
          collaboratorToken = collaboratorResponse.body.token

          request(app)
            .post(`/api/tasks/${record.id}/invites`).send({invite: fakeInvite})
            .set('Authorization', userToken)
            .end(() => {
              done()
            })
        }).catch(error => {
          logger.error(error.message)

          done()
        })
      })
    })
  })

  describe('GET /api/invites', () => {
    it('returns correct number of invites for user', done => {
      request(app)
        .get('/api/invites')
        .set('Authorization', userToken)
        .end((error, response) => {
          invite = response.body.data[1]

          expect(error).to.not.exist
          expect(response.statusCode).to.equal(OK)
          expect(response.body.data).to.have.length(2)
          expect(response.body.data[0].email).to.equal(collaborator.email.toLowerCase())
          expect(response.body.data[0].firstName).to.equal(collaborator.firstName)

          done()
        })
    })
  })

  describe('PATCH /api/invites/:id', () => {
    it('does not resend an invite that has not been sent', done => {
      request(app)
        .patch(`/api/invites/${invite.id}`).send({action: 'resend'})
        .set('Authorization', userToken)
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(ACCEPTED)
          expect(response.body.message).to.equal('Invite resent')
          expect(smtpStub.called).to.equal(false)

          done()
        })
    })

    it('does nothing when action is invalid', done => {
      request(app)
        .patch(`/api/invites/${invite.id}`).send({action: 'dance'})
        .set('Authorization', userToken)
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(ACCEPTED)
          expect(response.body.message).to.equal('Invite sent')
          expect(smtpStub.called).to.equal(false)

          done()
        })
    })

    it('does nothing when request body is invalid', done => {
      request(app)
        .patch(`/api/invites/${invite.id}`).send({})
        .set('Authorization', userToken)
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(ACCEPTED)
          expect(response.body.message).to.equal('Invite sent')
          expect(smtpStub.called).to.equal(false)

          done()
        })
    })

    it('does nothing when invite does not belong to user', done => {
      request(app)
        .patch(`/api/invites/${invite.id}`).send({action: 'send'})
        .set('Authorization', collaboratorToken)
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(ACCEPTED)
          expect(response.body.message).to.equal('Invite sent')
          expect(smtpStub.called).to.equal(false)

          done()
        })
    })

    it('does not send when invite id is invalid', done => {
      request(app)
        .patch(`/api/invites/${uuidV4()}`).send({action: 'send'})
        .set('Authorization', collaboratorToken)
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(ACCEPTED)
          expect(response.body.message).to.equal('Invite sent')
          expect(smtpStub.called).to.equal(false)

          done()
        })
    })

    it('does not resend when invite id is invalid', done => {
      request(app)
        .patch(`/api/invites/${uuidV4()}`).send({action: 'resend'})
        .set('Authorization', collaboratorToken)
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(ACCEPTED)
          expect(response.body.message).to.equal('Invite resent')
          expect(smtpStub.called).to.equal(false)

          done()
        })
    })

    it('sends invitation email correctly', done => {
      request(app)
        .patch(`/api/invites/${invite.id}`).send({action: 'send'})
        .set('Authorization', userToken)
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(ACCEPTED)
          expect(response.body.message).to.equal('Invite sent')
          expect(smtpStub.called).to.equal(true)

          done()
        })
    })

    it('resends invitation email correctly', done => {
      request(app)
        .patch(`/api/invites/${invite.id}`).send({action: 'resend'})
        .set('Authorization', userToken)
        .end((error, response) => {
          expect(error).to.not.exist
          expect(response.statusCode).to.equal(ACCEPTED)
          expect(response.body.message).to.equal('Invite resent')
          expect(smtpStub.called).to.equal(true)

          done()
        })
    })
  })

  describe('POST /api/invites/:tokenId/accept', () => {
    it('accepts invite correctly', done => {
      Invite.findOne({where: {id: invite.id}, include: Token}).then(record => {
        request(app)
          .post(`/api/invites/${record.Token.id}/accept`).send({...collaborator, email: fakeInvite.email})
          .end((error, response) => {
            existingUserToken = response.body.token

            expect(error).to.not.exist
            expect(response.statusCode).to.equal(CREATED)
            expect(response.body.token).to.exist
            expect(response.body.message).to.equal('User successfully created. Check your email for instructions')

            done()
          })
      })
    })

    it('does not accept an already accepted invite', done => {
      Invite.findOne({where: {id: invite.id}, include: Token}).then(record => {
        request(app)
          .post(`/api/invites/${record.Token.id}/accept`).send({...collaborator, email: fakeInvite.email})
          .end((error, response) => {
            expect(error).to.not.exist
            expect(response.body.token).to.not.exist
            expect(response.body.message).to.equal('Invite accepted')

            done()
          })
      })
    })
  })

  describe('when an existing user is invited to task', () => {
    it('does not an accept invite that has not been sent', done => {
      User.findOne({where: {emailDigest: digest(collaborator.email.toLowerCase())}, include: UserKey}).then(user => {
        generateKeyPair(collaborator.password).then(({SHAFingerprint: fingerprint, ...userKey}) => {
          user.createUserKey({fingerprint, ...userKey}).then(() => {
            request(app)
              .post('/api/tasks').send({title: 'Faire du shopping', description: 'Acheter les bonbons'})
              .set('Authorization', collaboratorToken)
              .end((_error, res) => {
                request(app)
                  .post(`/api/tasks/${res.body.data.id}/invites`).send({invite: fakeInvite})
                  .set('Authorization', collaboratorToken)
                  .end((_, invitation) => {
                    existingUserInvite = invitation.body.data

                    request(app)
                      .patch(`/api/invites/${existingUserInvite.id}`).send({action: 'accept'})
                      .set('Authorization', existingUserToken)
                      .end((error, response) => {
                        expect(error).to.not.exist
                        expect(response.statusCode).to.equal(ACCEPTED)
                        expect(response.body.message).to.equal('Invite accepted')

                        done()
                      })
                  })
              })
          })
        })
      })
    })

    it('does not allow user accept invite that do not belong to them', done => {
      request(app)
        .patch(`/api/invites/${existingUserInvite.id}`).send({action: 'send'})
        .set('Authorization', collaboratorToken)
        .end(() => {
          expect(smtpStub.called).to.equal(true)

          request(app)
            .patch(`/api/invites/${existingUserInvite.id}`).send({action: 'accept'})
            .set('Authorization', userToken)
            .end((error, response) => {
              expect(error).to.not.exist
              expect(response.statusCode).to.equal(ACCEPTED)
              expect(response.body.message).to.equal('Invite accepted')

              done()
            })
        })
    })

    it('accepts invite correctly for existing user', done => {
        request(app)
          .patch(`/api/invites/${existingUserInvite.id}`).send({action: 'accept'})
          .set('Authorization', existingUserToken)
          .end((error, response) => {
            expect(error).to.not.exist
            expect(response.statusCode).to.equal(ACCEPTED)
            expect(response.body.message).to.equal('Invite accepted')

            done()
          })
    })
  })
})
