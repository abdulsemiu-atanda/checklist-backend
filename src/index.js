import graceful from 'graceful'

import app from './app'
import logger from './app/constants/logger'

const port = process.env.PORT || 3000

const server = app.listen(port, () => {
  logger.verbose('-'.repeat(80))
  logger.info(`Server is running on ${port}`)
  logger.verbose('-'.repeat(80))
})

graceful({servers: [server], killTimeout: '15s'})
