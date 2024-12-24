import EmailBuilder from '../services/EmailBuilder'

export default (user, token) => {
  const email = new EmailBuilder(
    {to: user.email, subject: 'Password Rest Instructions'},
    [
      `Hi ${user.firstName},`,
      'You have requested a password reset. Please click the link below.',
      `**${token}**`,
      'If you did not request a password change, please ignore this email.',
      'Do not share this email with anyone.'
    ]
  )

  return email.build()
}
