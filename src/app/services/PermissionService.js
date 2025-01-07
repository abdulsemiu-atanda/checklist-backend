import DataService from './DataService'

import {EDIT} from '../../config/permissions'

class PermissionService {
  constructor(models) {
    this.models = models

    this.permission = new DataService(models.Permission)
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

  #hasEditPermission({taskId, userId}) {
    return this.permission.show({taskId}, {where: {ownableId: userId, ownableType: 'User'}}).then(permission => {
      if (permission)
        return permission.type === EDIT

      return false
    })
  }

  isOwnerOrCollaborator({id, userId}) {
    return this.endpointMap.tasks.show({id}).then(task => {
      if (task)
        return task.userId === userId || this.#hasEditPermission({taskId: task.id, userId})

      return false
    })
  }
}

export default PermissionService
