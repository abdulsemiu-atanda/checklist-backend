import bodyParser from 'body-parser'
import express from 'express'

const app = express()

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

app.get('*', (req, res) => res.status(200).send({
  message: 'Welcome to Checklist API',
}))

export default app
