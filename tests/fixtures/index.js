import {fakerYO_NG as faker} from '@faker-js/faker'

import DataService from '../../src/app/services/DataService'
import db from '../../src/db/models'
import {isEmpty} from '../../src/util/tools'

import {ADMIN, USER} from '../../src/config/roles'

const createUser = ({data, trait}) => {
  const {fakeUser, adminUser} = require('./users')
  const role = new DataService(db.Role)
  const user = new DataService(db.User)

  if (trait === ADMIN) {
    return role.create({name: ADMIN}).then(([record]) => {
      const shared = {RoleId: record.id}
      const attributes = isEmpty(data) ? {...adminUser, ...shared} : {...data, ...shared}

      return user.create(attributes)
    })
  } else {
    return role.create({name: USER}).then(([record]) => {
      const shared = {RoleId: record.id}
      const attributes = isEmpty(data) ? {...fakeUser, ...shared, email: faker.internet.email()} : {...data, ...shared}

      return user.create(attributes)
    })
  }
}

export const create = ({type, data = {}, trait = ''}) => {
  switch(type) {
    case 'users': 
      return createUser({data, trait})
    default:
      return
  }
}

export const seedRecords = async ({count = 1, type}) => {
  for (let step = 0; step < count; step++)
    await create({type})
}
