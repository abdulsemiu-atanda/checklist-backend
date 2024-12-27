/**@class DataService
 *
 * @description
 * Repository class that provide and interface for all database operations.
 *
 * @example
 * const service = new DataService(db.Role)
 *
 * service.index().then(records => console.log(records))
 */
class DataService {
  constructor(model) {
    this.model = model
  }

  /**
   * Creates a new record with the provided resource if it does not exist
   * @param {{column: String | Number | Date | Array | Object}} resource - attributes for new record with the unique attribute listed first
   * @returns {Promise}
   */
  create(resource) {
    const [column] = Object.keys(resource)

    return this.model.findOrCreate({
      where: {[column]: resource[column]},
      defaults: resource
    })
  }

  /**
   * Finds a single resource and returns its value
   * @param {Object} identifier - key value for finding a resource
   * @param {Object} options - find options, addition clauses can be defined in unsing `where` attribute (optional)
   * @returns {Promise}
   */
  show(identifier, options = {}) {
    const [column] = Object.keys(identifier)
    const {where: additionalClause = {}, ...otherOptions} = options

    return this.model.findOne({
      where: {[column]: identifier[column], ...additionalClause},
      ...otherOptions
    })
  }

  /**
   * Returns all the record in the model's table.
   * @param {Object} options - specifying what group of records to be returned (optional)
   * @param {boolean} paginated - use when paging records (optional)
   * @returns {Promise}
   */
  index(options = {}, paginated = false) {
    return paginated ? this.model.findAndCountAll(options) : this.model.findAll(options)
  }

  /**
   * Updates record with specified id
   * @param {String} id - record id
   * @param {Object} attributes - attributes to be updated on the specified record
   * @returns {Promise}
   */
  update(id, attributes) {
    return this.show({id}).then(record => record.update(attributes))
  }

  /**
   * Destroys the record with the specified id
   * @param {String} id
   * @returns {Promise}
   */
  destroy(id) {
    return this.model.destroy({where: {id}})
  }
}

export default DataService
