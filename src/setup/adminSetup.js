import inquirer from 'inquirer'

import DataService from '../app/services/DataService'
import db from '../db/models'
import logger from '../app/constants/logger'
import {ADMIN} from '../config/roles'

const role = new DataService(db.Role)
const user = new DataService(db.User)

const questions = [
  {
    type: 'input',
    name: 'firstName',
    message: 'Admin First Name:',
    default() { return 'Admin' }
  },
  {
    type: 'input',
    name: 'lastName',
    message: 'Admin Last Name:',
    default() { return 'User' }
  },
  {
    type: 'input',
    name: 'email',
    message: 'Admin Email:'
  },
  {
    type: 'password',
    name: 'password',
    message: 'Admin Password:'
  }
]

inquirer.prompt(questions).then(answers => {
  role.show({name: ADMIN}).then(record => {
    if (record) {
      user.create({...answers, roleId: record.id}).then(([_, created]) => {
        if (created)
          logger.info('Admin user successfully created')
      }).catch(({errors}) => {
        const [error] = errors

        logger.error(error.message)
      })
    } else {
      logger.info('Admin role has not been created. Please run seeders and try again.')
    }
  })
}).catch(error => {
  logger.error(error.message)
})
