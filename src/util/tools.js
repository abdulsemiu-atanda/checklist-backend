import {encodeUTF8} from 'tweetnacl-util'

import EmailService from '../app/services/EmailService'
import environment from '../config/environment'

environment()

export const dateToISOString = date => (new Date(date)).toISOString()

export const dasherizeCamelCase = (word) =>
  word.replace(/([a-zA-Z])(?=[A-Z])/g, '$1-').toLowerCase()

export const isEmpty = data => {
  if (Array.isArray(data))
    return data.length === 0
  else
    return Object.keys(data).length === 0
}

export const smtpServer = () => {
  const server = new EmailService({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
      user: process.env.SMTP_USERNAME,
      pass: encodeUTF8(Uint8Array.from(process.env.SMTP_PASSWORD.split(',')))
    }
  })

  return server
}
