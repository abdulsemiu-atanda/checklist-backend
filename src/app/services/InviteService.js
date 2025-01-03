import DataService from './DataService'
import {dateToISOString, smtpServer} from '../../util/tools'
import inviteEmail from '../mailers/inviteEmail'

import {ACCEPTED} from '../constants/statusCodes'
import {PENDING} from '../../config/invites'

class InviteService {
  constructor(models) {
    this.models = models
    this.smtp = smtpServer()

    this.invite = new DataService(models.Invite)
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
}

export default InviteService
