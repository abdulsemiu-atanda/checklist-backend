import {createClient} from 'redis'

class KeystoreService {
  constructor(encryptor) {
    if (!KeystoreService.instance) {
      this.encryptor = encryptor
      this.client = createClient({url: process.env.REDIS_URL})
      KeystoreService.instance = this
    }

    return KeystoreService.instance
  }

  /**
   * Registers value with the specified key to REDIS database
   * @param {{key: String, value: String, expiresIn: Number}}
   * @returns {Promise<String | null>}
   */
  insert({key, value, expiresIn = 3600}) {
    return this.client.setEx(key, expiresIn, this.encryptor.encrypt(value))
  }

  /**
   * Returns value associated with the specified keu
   * @param {String} key
   * @returns {Promise<String | null>}
   */
  retrieve(key) {
    return this.client.get(key).then(value => {
      if (value)
        return this.encryptor.decrypt(value)

      return value
    })
  }

  remove(key) {
    return this.client.del([key])
  }
}

export default KeystoreService
