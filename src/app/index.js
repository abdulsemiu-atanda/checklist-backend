import bodyParser from 'body-parser'
import fs from 'fs'
import morgan from 'morgan'
import express from 'express'

import {dasherizeCamelCase, smtpServer} from '../util/tools'
import logger from './constants/logger'

const emailSender = smtpServer()
const app = express()

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

app.disable('x-powered-by')
app.use(morgan('tiny'))

// Verify SMTP Server connection
emailSender.transporter.verify(error => {
  if (error)
    logger.error(error.message)
  else
    logger.info('SMTP Server connection was successful.')
})

fs.readdirSync(`${__dirname}/routes/`)
  .filter((file) => file.slice(-3) === '.js')
  .forEach((file) => {
    const namespace = file.split('.')[0]
    const routes = require(`./routes/${file}`).default

    app.use(`/api/${dasherizeCamelCase(namespace)}`, routes)
  })

if (process.env.NODE_ENV === 'development') {
  const {setupDevServer} = require('../util/serverTools')

  setupDevServer(app)
}

app.get('*', (req, res) => res.status(200).send({
  message: 'Welcome to Checklist API',
}))

export default app
