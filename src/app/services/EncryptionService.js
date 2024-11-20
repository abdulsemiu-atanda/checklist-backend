class EncryptionService {
  key

  constructor(key) {
    if (typeof key !== 'string' || key.length !== 32)
      throw new TypeError('Invalid initialization parameters, expect key: [String] with length 32.')

    this.key = Buffer.from(key)
  }

  encrypt() {
    throw new ReferenceError('encrypt is undefined')
  }

  decrypt() {
    throw new ReferenceError('decrypt is undefined')
  }
}

export default EncryptionService
