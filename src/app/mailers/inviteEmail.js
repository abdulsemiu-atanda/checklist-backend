import EmailBuilder from '../services/EmailBuilder'

export default (collaborator, token) => {
  const email = new EmailBuilder(
    {to: collaborator.email, subject: 'Task Collaboration Invite'},
    [
      `Hi ${collaborator.firstName},`,
      `You have been invited to Checklist by ${collaborator.User.firstName} to collaborate on a task`,
      'Please use the link below to accept',
      `**${token}**`
    ]
  )

  return email.build()
}
