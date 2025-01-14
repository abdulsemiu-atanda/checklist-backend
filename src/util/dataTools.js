export const formatData = (data, attributes = []) => {
  const existingAttributes = attributes.filter(property => Object.keys(data).includes(property))

  if (attributes.length === 0 || existingAttributes.length === 0)
    return data
  else
    return existingAttributes.reduce((accumulator, key) => ({...accumulator, [key]: data[key]}), {})
}

const modelDictionary = models => ({
  task: {model: models.Task},
  tasks: {model: models.Task},
  invite: {model: models.Invite, attributes: {exclude: ['emailDigest']}},
  invites: {model: models.Invite, attributes: {exclude: ['emailDigest']}},
  permission: {model: models.Permission},
  permissions: {model: models.Permission},
  user: {model: models.User, attributes: {exclude: ['password', 'roleId', 'emailDigest', 'confirmed', 'confirmedAt']}},
  users: {model: models.User, attributes: {exclude: ['password', 'roleId', 'emailDigest', 'confirmed', 'confirmedAt']}},
})

export const eagerLoading = (included, models) => {
  const associations = included.split(',').map(association => association.split('.'))

  return associations.reduce((collection, modelNames) => {
    const [parentModelName, childModelName] = modelNames
    const parentModel = modelDictionary(models)[parentModelName]
    const childModel = modelDictionary(models)[childModelName]
    const existing = collection.findIndex(record => record.model.name === parentModel?.model?.name)

    if (existing >= 0) {
      const shared = {...collection[existing]}

      collection[existing] = collection[existing].include ?
        {...shared, include: [...collection[existing].include, childModel]} :
        {...shared, include: [childModel]}

      return collection
    } else if (parentModel) {
      const config = childModel ? {...parentModel, include: [childModel]} : parentModel

      return [...collection, config]
    }

    return collection
  }, [])
}
