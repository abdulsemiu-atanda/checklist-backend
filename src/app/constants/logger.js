import winston from 'winston'

export default winston.createLogger({
  transports: [new winston.transports.Console({level: process.env.JS_LOG || 'info'})],
  format: winston.format.simple()
})
