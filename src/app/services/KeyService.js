import AsymmetricEncryptionService from './AsymmetricEncryptionService'
import DataService from './DataService'

class KeyService {
  constructor(models, passphrase) {
    this.models = models

    this.user = new DataService(models.User)
    this.userKey = new DataService(models.UserKey)
    this.sharedKey = new DataService(models.SharedKey)
    this.encryptor = new AsymmetricEncryptionService(passphrase)
  }

  #userKeys({userId, ownableId, isOwner = false}) {
    return Promise.all([
      this.user.show(
        {id: isOwner ? userId : ownableId},
        {include: [this.models.UserKey]}
      ),
      this.sharedKey.show({userId}, {where: {ownableId}})
    ])
  }

  rawTaskKey({taskUserId, currentUserId}) {
    const isOwner = taskUserId === currentUserId

    return this.#userKeys({userId: taskUserId, ownableId: currentUserId, isOwner}).then(([user, taskKey]) => {
      const userKey = user.UserKey

      return this.encryptor.decrypt({privateKey: userKey.privateKey, encrypted: taskKey.key})
    })
  }

  grantTaskKeyToUser({userId, ownableId}) {
    return Promise.all([
      this.userKey.show({userId: userId}),
      this.userKey.show({userId: ownableId})
    ]).then(([ownerKey, currentUserKey]) => {
      return this.sharedKey.show({userId: userId}, {where: {ownableId: userId}}).then(taskKey => {
        const decryptor = new AsymmetricEncryptionService(process.env.ENCRYPTION_KEY)
        const rawKey = decryptor.decrypt({privateKey: ownerKey.backupKey, encrypted: taskKey.key})

        return this.sharedKey.create({key: this.encryptor.encrypt({...currentUserKey.toJSON(), data: rawKey}), ownableId, userId})
      })
    })
  }
}

export default KeyService
