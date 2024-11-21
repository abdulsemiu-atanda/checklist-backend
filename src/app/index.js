import bodyParser from 'body-parser'
import fs from 'fs'
import morgan from 'morgan'
import express from 'express'

import {dasherizeCamelCase} from '../util/tools'
import logger from './constants/logger'

const app = express()

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

app.disable('x-powered-by')
app.use(morgan('tiny'))

fs.readdirSync(`${__dirname}/routes/`)
  .filter((file) => file.slice(-3) === '.js')
  .forEach((file) => {
    const namespace = file.split('.')[0]
    const routes = require(`./routes/${file}`).default

    app.use(`/api/${dasherizeCamelCase(namespace)}`, routes)
  })

app.get('*', (req, res) => res.status(200).send({
  message: 'Welcome to Checklist API',
}))

if (process.env.NODE_ENV === 'development') {
  const listRoutes = require('express-list-endpoints')
  const Table = require('cli-table')

  const routeList = listRoutes(app).map(route => ({[route.path]: route.methods.join(' | ')}))
  const table = new Table()

  table.push({Endpoints: 'Methods'}, ...routeList)

  logger.verbose('-'.repeat(80))
  logger.verbose(`THESE ARE THE AVAILABLE ENDPOINTS: \n${table.toString()}`)
}

export default app
