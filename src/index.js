import graceful from 'graceful'

import app from './app'
import logger from './app/constants/logger'

const port = process.env.PORT || 3000

const server = app.listen(port, () => {
  logger.info(`Server is running on ${port}`)
})

graceful({servers: [server], killTimeout: '15s'})
