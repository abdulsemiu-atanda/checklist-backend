import DataService from './DataService'
import {dateToISOString, smtpServer} from '../../util/tools'
import logger from '../constants/logger'
import inviteEmail from '../mailers/inviteEmail'

import {ACCEPTED, OK, UNPROCESSABLE} from '../constants/statusCodes'
import {PENDING} from '../../config/invites'
import {SHARING} from '../../config/tokens'
import {UNPROCESSABLE_REQUEST} from '../constants/messages'

class InviteService {
  constructor(models) {
    this.models = models
    this.smtp = smtpServer()

    this.invite = new DataService(models.Invite)
    this.token = new DataService(models.Token)
  }

  #invite(id) {
    return this.invite.show(
      {id},
      {
        include: {
          model: this.models.Token,
          include: [
            {model: this.models.User},
            {model: this.models.User, as: 'Collaborator'},
            {model: this.models.Invite, as: 'Lead'}
          ]
        }
      }
    )
  }

  #emailPayload(token) {
    const {Collaborator, Lead, User} = token
    const collaborator = token.tokenableType === 'User' ? {...Collaborator, User} : {...Lead, User}

    return [collaborator, token.value]
  }

  send({id, currentUserId}, callback) {
    this.#invite(id).then(invite => {
      const token = invite?.Token?.toJSON()

      if (token?.userId === currentUserId) {
        this.invite.update(invite.id, {sentAt: dateToISOString(Date.now()), status: PENDING}).then(() => {
          this.smtp.delay(3000).send(inviteEmail(...this.#emailPayload(token)))
        })
      }

      callback({status: ACCEPTED, response: {message: 'Invite sent', success: true}})
    })
  }

  resend({id, currentUserId}, callback) {
    this.#invite(id).then(invite => {
      const token = invite?.Token?.toJSON()

      if (token?.userId === currentUserId && invite.sentAt)
        this.smtp.delay(3000).send(inviteEmail(...this.#emailPayload(token)))

      callback({status: ACCEPTED, response: {message: 'Invite resent', success: true}})
    })
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
