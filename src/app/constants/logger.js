import winston from 'winston'

const level = process.env.NODE_ENV === 'development' ? 'debug' : 'info'

export default winston.createLogger({
  transports: [new winston.transports.Console({level})],
  format: winston.format.simple()
})
