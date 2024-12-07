import nodemailer from 'nodemailer'

import logger from '../constants/logger'

class EmailService {
  transporter

  constructor(config) {
    if (!EmailService.instance) {
      this.transporter = nodemailer.createTransport(config)
      EmailService.instance = this
    }

    return EmailService.instance
  }

  send(email) {
    return this.transporter.sendMail(email, (error, info) => {
      if (!error && process.env.NODE_ENV === 'development')
        logger.info(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`)

      if (error)
        logger.error(error.message)
      else
        logger.info(`Message sent: ${info.messageId}`)
    })
  }

  delay(timeout) {
    return {
      send: email => { setTimeout(() => this.send(email), timeout) }
    }
  }
}

export default EmailService
