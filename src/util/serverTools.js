import {createProxyMiddleware} from 'http-proxy-middleware'
import {encodeUTF8} from 'tweetnacl-util'
import listRoutes from 'express-list-endpoints'
import MailDev from 'maildev'
import Table from 'cli-table'

import logger from '../app/constants/logger'

export const setupDevServer = app => {
  const maildevWebPort = process.env.MAILDEV_WEB_PORT || 1080
  const maildev = new MailDev({
    outgoingHost: process.env.SMTP_HOST,
    outgoingUser: process.env.SMTP_USERNAME,
    outgoingPass: encodeUTF8(Uint8Array.from(process.env.SMTP_PASSWORD.split(','))),
    basePathname: '/maildev',
    web: maildevWebPort
  })

  maildev.listen(error => {
    if (error)
      logger.error('Unable to start MailDev server')
    else
      logger.info(`MailDev Server is running on ${maildevWebPort}`)
  })

  const proxy = createProxyMiddleware('/maildev', {
    target: `http://localhost:${maildevWebPort}`,
    ws: true
  })

  app.use(proxy)

  const routeList = listRoutes(app).map(route => ({[route.path]: route.methods.join(' | ')}))
  const table = new Table()

  table.push({Endpoints: 'Methods'}, ...routeList)

  logger.verbose('-'.repeat(80))
  logger.verbose(`THESE ARE THE AVAILABLE ENDPOINTS: \n${table.toString()}`)
}
