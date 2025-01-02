import DataService from './DataService'

class PermissionService {
  constructor(models) {
    this.models = models
    this.endpointMap = {
      tasks: new DataService(models.Task),
      users: new DataService(models.User)
    }
  }

  /**
   * Returns appropriate `DataService` fron the specified endpoint
   * @param {String} endpoint
   * @returns {DataService | undefined}
   */
  #service(endpoint) {
    const pathname = endpoint.split('/')[2]

    return this.endpointMap[pathname]
  }

  /**
   * Checks if the record belongs to current user
   * @param {{id: String, userId: String, endpoint: String}}
   * @returns {Promise<boolean>}
   */
  isOwner({id, userId, endpoint}) {
    return this.#service(endpoint).show({id}).then(record => {
      if (record)
        return record.userId === userId

      return true
    })
  }
}

export default PermissionService
