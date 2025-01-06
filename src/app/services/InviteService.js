import DataService from './DataService'
import {dateToISOString, redisKeystore, smtpServer} from '../../util/tools'
import {digest, updatePrivateKey} from '../../util/cryptTools'
import logger from '../constants/logger'
import inviteEmail from '../mailers/inviteEmail'

import {ACCEPTED, OK, UNPROCESSABLE} from '../constants/statusCodes'
import {PENDING} from '../../config/invites'
import {SHARING} from '../../config/tokens'
import {UNPROCESSABLE_REQUEST} from '../constants/messages'

class InviteService {
  #keystore = redisKeystore()

  constructor(models) {
    this.models = models
    this.smtp = smtpServer()

    this.invite = new DataService(models.Invite)
    this.token = new DataService(models.Token)
    this.user = new DataService(models.User)
    this.userKey = new DataService(models.UserKey)
    this.sharedKey = new DataService(models.SharedKey)
    this.permission = new DataService(models.Permission)

    this.accept = this.accept.bind(this)
    this.resend = this.resend.bind(this)
    this.send = this.send.bind(this)
  }

  #invite(id) {
    return this.invite.show(
      {id},
      {
        include: {
          model: this.models.Token,
          include: [this.models.User]
        }
      }
    )
  }

  #user(email) { return this.user.show({emailDigest: digest(email)}) }

  #emailPayload(invite, existingUser) {
    const {User, ...token} = invite.Token
    const collaborator = {...invite, User}

    return [collaborator, token.value, !!existingUser]
  }

  send({id, currentUserId}, callback) {
    this.#invite(id).then(invite => {
      const token = invite?.Token?.toJSON()

      if (token?.userId === currentUserId) {
        this.#user(invite.email).then(user => {
          this.invite.update(invite.id, {sentAt: dateToISOString(Date.now()), status: PENDING}).then(() => {
            this.smtp.delay(3000).send(inviteEmail(...this.#emailPayload(invite.toJSON(), user)))
          })
        })
      }

      callback({status: ACCEPTED, response: {message: 'Invite sent', success: true}})
    })
  }

  resend({id, currentUserId}, callback) {
    this.#invite(id).then(invite => {
      const token = invite?.Token?.toJSON()

      if (token?.userId === currentUserId && invite.sentAt) {
        this.#user(invite.email).then(user => {
          this.smtp.delay(3000).send(inviteEmail(...this.#emailPayload(invite.toJSON(), user)))
        })
      }

      callback({status: ACCEPTED, response: {message: 'Invite resent', success: true}})
    })
  }

  accept({id, currentUserId}, callback) {
    this.models.sequelize.transaction(transaction => {
      const changeOptions = {transaction}

      this.#invite(id).then(invite => {
        if (invite.Token.userId === currentUserId || invite.status !== PENDING) {
          callback({status: ACCEPTED, response: {message: 'Invite accepted', success: true}})
        } else {
          this.user.show({id: currentUserId}).then(currentUser => {
            if (currentUser.email === invite.email) {
              this.#keystore.retrieve(currentUserId).then(session => {
                this.invite.update(invite.id, {acceptedAt: dateToISOString(Date.now()), status: 'accepted'}, changeOptions)
                this.permission.show({ownableId: invite.id, ownableType: 'Invite'}).then(permission => {
                  this.permission.update(permission.id, {ownableId: currentUser.id, ownableType: 'User'}, changeOptions)
                })

                this.userKey.show({userId: invite.Token.userId}).then(parentKey => {
                  const key = updatePrivateKey({backupKey: parentKey.backupKey, passphrase: session})

                  this.sharedKey.create({key, userId: invite.Token.userId, ownableId: currentUser.id}, changeOptions)
                    .then(() => {
                      callback({status: ACCEPTED, response: {message: 'Invite accepted', success: true}})
                    })
                })
              })
            } else {
              callback({status: ACCEPTED, response: {message: 'Invite accepted', success: true}})
            }
          })
        }
      }).catch(error => {
        logger.error(error.message)

        callback({status: UNPROCESSABLE, response: {message: UNPROCESSABLE_REQUEST, success: true}})
      })
    })
  }

  update({id, currentUserId, payload: {action}}, callback) {
    if (action) {
      const sendResendInvite = this[action]

      if (sendResendInvite)
        sendResendInvite({id, currentUserId}, callback)
      else
        callback({status: ACCEPTED, response: {message: 'Invite sent', success: true}})
    } else {
      callback({status: ACCEPTED, response: {message: 'Invite sent', success: true}})
    }
  }

  index(currentUserId, callback) {
    this.token.index({
      where: {userId: currentUserId, type: SHARING},
      include: {model: this.models.Invite, attributes: {exclude: ['emailDigest']}}
    }).then(tokens => {
      const invites = tokens.map(token => token.Invite.toJSON())

      callback({status: OK, response: {data: invites, success: true}})
    }).catch(error => {
      logger.error(error.message)

      callback({status: UNPROCESSABLE, response: {message: UNPROCESSABLE_REQUEST, success: true}})
    })
  }
}

export default InviteService
