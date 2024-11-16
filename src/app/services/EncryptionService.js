import crypto from 'crypto'

class EncryptionService {
  #DIGEST_ALGORITHM = 'SHA-256'
  iv = crypto.getRandomValues(new Uint8Array(12))
  key

  constructor(key) {
    if (typeof key !== 'string')
      throw new TypeError('Invalid initialization parameters, expect key: [String].')

    this.key = new TextEncoder().encode(key)
  }

  async digest() {
    const digest = await crypto.subtle.digest(this.#DIGEST_ALGORITHM, this.key)

    return digest
  }

  async encrypt(data) {
    throw new ReferenceError('encrypt is undefined')
  }

  async decrypt(encryptedData) {
    throw new ReferenceError('decrypt is undefined')
  }
}

export default EncryptionService
