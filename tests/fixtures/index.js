import {fakerYO_NG as faker} from '@faker-js/faker'

import DataService from '../../src/app/services/DataService'
import db from '../../src/db/models'
import {isEmpty} from '../../src/util/tools'
import {adminUser, fakeUser} from './users'

import {ADMIN, USER} from '../../src/config/roles'
import AsymmetricEncryptionService from '../../src/app/services/AsymmetricEncryptionService'

const defaultUser = trait => {
  if (trait === ADMIN)
    return adminUser
  else
    return {...fakeUser, email: faker.internet.email()}
}

const createUser = ({data, trait}) => {
  const encryptor = new AsymmetricEncryptionService(data.password || fakeUser.password)
  const role = new DataService(db.Role)
  const user = new DataService(db.User)
  const roleName = trait === ADMIN ? ADMIN : USER

  switch(trait) {
    case 'withUserKey':
      return role.create({name: USER}).then(([record]) => {
        const shared = {roleId: record.id}
        const attributes = isEmpty(data) ? {...fakeUser, ...shared, email: faker.internet.email()} : {...data, ...shared}

        return encryptor.generateKeyPair().then(({SHAFingerprint, ...keyPair}) => {
          return user.create({...attributes, UserKey: {...keyPair, fingerprint: SHAFingerprint}}, {include: db.UserKey})
        })
      })
    default:
      return role.create({name: roleName}).then(([record]) => {
        const shared = {roleId: record.id}
        const attributes = isEmpty(data) ? {...defaultUser(trait), ...shared} : {...data, ...shared}

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
