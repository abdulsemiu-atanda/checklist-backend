class EncryptionService {
  key

  constructor(key, mode = 'symmetric') {
    if (typeof key !== 'string' || (mode === 'symmetric' && key.length !== 32))
      throw new TypeError('Invalid initialization parameters, expect key: [String] with length 32.')

    this.key = mode === 'symmetric' ? Buffer.from(key) : key
  }

  encrypt() {
    throw new ReferenceError('encrypt is undefined')
  }

  decrypt() {
    throw new ReferenceError('decrypt is undefined')
  }
}

export default EncryptionService
