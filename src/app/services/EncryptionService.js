import crypto from 'crypto'

class EncryptionService {
  key

  constructor(key, mode = 'symmetric') {
    if (typeof key !== 'string')
      throw new TypeError('Invalid initialization parameters, expect key: [String].')

    this.key = mode === 'symmetric' ? crypto.scryptSync(key, process.env.ENCRYPTION_SALT, 32) : key
  }

  encrypt() {
    throw new ReferenceError('encrypt is undefined')
  }

  decrypt() {
    throw new ReferenceError('decrypt is undefined')
  }
}

export default EncryptionService
