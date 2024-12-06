import bodyParser from 'body-parser'
import fs from 'fs'
import morgan from 'morgan'
import express from 'express'
import Table from 'cli-table'
import {Umzug, SequelizeStorage} from 'umzug'

import db from '../db/models'
import {dasherizeCamelCase, isEmpty, smtpServer} from '../util/tools'
import logger from './constants/logger'

const app = express()
const emailSender = smtpServer()
const umzug = new Umzug({
  migrations: {glob: `${__dirname}/../db/migrations/*.js`},
  context: db.sequelize.getQueryInterface(),
  storage: new SequelizeStorage({sequelize: db.sequelize}),
  logger: console
})

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

// Check pending migration and run migrations
umzug.pending().then(migrations => {
  if (isEmpty(migrations)) {
    logger.info('Database is up to date with migrations.')
  } else {
    const collection = migrations.map(migration => ({[migration.name]: migration.path || 'N/A'}))
    const table = new Table()

    table.push({Name: 'Path'}, ...collection)

    logger.verbose(`THESE ARE THE PENDING MIGRATIONS: \n${table.toString()}`)
  }
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
