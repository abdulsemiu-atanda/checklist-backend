import EmailBuilder from '../services/EmailBuilder'

export default (invite, token, existingUser) => {
  const action = existingUser ? ['Please login to accept the invite'] : ['Please use the link below to accept', `**${token}**`]
  const email = new EmailBuilder(
    {to: invite.email, subject: 'Task Collaboration Invite'},
    [
      `Hi ${invite.firstName},`,
      `You have been invited to Checklist by ${invite.User.firstName} to collaborate on a task`,
      ...action
    ]
  )

  return email.build()
}
