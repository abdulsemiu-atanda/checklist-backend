import listRoutes from 'express-list-endpoints'
import Table from 'cli-table'

import logger from '../app/constants/logger'

export const setupDevServer = app => {
  const routeList = listRoutes(app).map(route => ({[route.path]: route.methods.join(' | ')}))
  const table = new Table()

  table.push({Endpoints: 'Methods'}, ...routeList)

  logger.verbose('-'.repeat(80))
  logger.verbose(`THESE ARE THE AVAILABLE ENDPOINTS: \n${table.toString()}`)
}
