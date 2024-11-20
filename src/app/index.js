import bodyParser from 'body-parser'
import fs from 'fs'
import morgan from 'morgan'
import express from 'express'

import {dasherizeCamelCase} from '../util/tools'

const app = express()

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

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

export default app
