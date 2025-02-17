import crypto from 'crypto'
import {fakerYO_NG as faker} from '@faker-js/faker'

import AsymmetricEncryptionService from '../../src/app/services/AsymmetricEncryptionService'
import DataService from '../../src/app/services/DataService'
import KeyService from '../../src/app/services/KeyService'
import SymmetricEncryptionService from '../../src/app/services/SymmetricEncryptionService'

import {adminUser, fakeUser} from './users'
import {dateToISOString, isEmpty} from '../../src/util/tools'
import db from '../../src/db/models'
import {generateCode} from '../../src/util/authTools'
import logger from '../../src/app/constants/logger'
import {digest, encryptFields, secureHash, updatePrivateKey} from '../../src/util/cryptTools'

import {ADMIN, USER} from '../../src/config/roles'
import {SHARING} from '../../src/config/tokens'
import {ACCEPTED} from '../../src/config/invites'
import {READ} from '../../src/config/permissions'

const user = new DataService(db.User)

const defaultUser = trait => {
  if (trait === ADMIN)
    return adminUser
  else
    return {...fakeUser, email: faker.internet.email()}
}

const createUser = ({data, trait}) => {
  const encryptor = new AsymmetricEncryptionService(data.password || fakeUser.password)
  const role = new DataService(db.Role)
  const roleName = trait === ADMIN ? ADMIN : USER

  switch(trait) {
    case 'withUserKey':
      return role.create({name: USER}).then(([record]) => {
        const shared = {roleId: record.id}
        const attributes = isEmpty(data) ? {...fakeUser, ...shared, email: faker.internet.email()} : {...data, ...shared}

        return encryptor.generateKeyPair().then(({SHAFingerprint, ...keyPair}) => {
          return user.create({...attributes, UserKey: {...keyPair, fingerprint: SHAFingerprint}}, {include: [db.UserKey]})
            .then(([record, created]) => {
              const key = encryptor.encrypt({...record.toJSON().UserKey, data: crypto.randomBytes(64).toString('hex')})

              return db.SharedKey.create({key, userId: record.id, ownableId: record.id}).then(data => ([record, created]))
            })
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

export const setupTaskCollaboration = ({inviter, invitee, permissionType = READ}) => {
  return Promise.all([
    user.show({emailDigest: digest(inviter.email.toLowerCase())}, {include: [db.UserKey, db.SharedKey]}),
    create({type: 'users', data: invitee, trait: 'withUserKey'})
  ]).then(async ([record, [collaborator]]) => {
    const owner = record ? record : (await create({type: 'users', data: inviter, trait: 'withUserKey'}))[0]

    logger.info(`Created owner with user id ${owner.id}`)
    logger.info(`Created collaborator with user id ${collaborator.id}`)

    const keyService = new KeyService(db, inviter.password)
    const rawKey = await keyService.rawTaskKey({taskUserId: owner.id, currentUserId: owner.id})
    const encryptor = new SymmetricEncryptionService(rawKey)
    const data = {title: faker.book.title(), description: faker.lorem.paragraphs(2)}
    const encrypted = encryptFields({record: data, encryptor})

    return Promise.all([
      owner.createTask(encrypted),
      keyService.grantTaskKeyToUser({userId: owner.id, ownableId: collaborator.id}),
      owner.createToken({value: secureHash(generateCode(9)), type: SHARING})
    ]).then(([task, _sharedKey, token]) => {
      const now = dateToISOString(Date.now())

      return Promise.all([
        task.createPermission({ownableId: collaborator.id, ownableType: 'User', type: permissionType}),
        token.createInvite({...invitee, status: ACCEPTED, acceptedAt: now, sentAt: now})
      ]).then(() => {
        logger.info('Successfully set up collaboration')

        return task
      })
    })
  }).catch(error => {
    logger.error(error.message)

    logger.info('Something went wrong setting up collaboration')
  })
}
