import EmailBuilder from '../services/EmailBuilder'

export default (user, code) => {
  const email = new EmailBuilder(
    {to: user.email, subject: 'Account Confirmation'},
    [
      `Hi ${user.firstName}`,
      'Thanks for signing up to Checklist. Use the confirmation code below',
      `**${code}**`,
      'We hope you enjoy our service'
    ]
  )

  return email.build()
}
