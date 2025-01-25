import db from '../../db/models'
import PermissionService from '../services/PermissionService'

import {INCOMPLETE_REQUEST} from '../constants/messages'
import {UNAUTHORIZED} from '../constants/statusCodes'

const service = new PermissionService(db)

const permissions = {
  isOwner: async (req, res, next) => {
    if (await service.isOwner({id: req.params.id, userId: req.user.id || req.userId, endpoint: req.baseUrl}))
      next()
    else
      res.status(UNAUTHORIZED).send({message: INCOMPLETE_REQUEST, success: false})
  },
  isOwnerOrCollaborator: async (req, res, next) => {
    if (await service.isOwnerOrCollaborator({id: req.params.id, userId: req.user.id}))
      next()
    else
      res.status(UNAUTHORIZED).send({message: INCOMPLETE_REQUEST, success: false})
  }
}

export default permissions
