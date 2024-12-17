import DataService from '../services/DataService'
import db from '../../db/models'
import {OK, UNPROCESSABLE} from '../constants/statusCodes'
import logger from '../constants/logger'
import {UNPROCESSABLE_REQUEST} from '../constants/messages'

const role = new DataService(db.Role)

const roles = {
  index: (_req, res) => {
    role.index()
      .then(records => res.status(OK).send({data: records}))
      .catch(({errors}) => {
        const [error] = errors

        logger.error(error.message)
        res.status(UNPROCESSABLE).send({message: UNPROCESSABLE_REQUEST})
      })
  }
}

export default roles
