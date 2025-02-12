import crypto from 'crypto'
import forge from 'node-forge'

import EncryptionService from './EncryptionService'

class SymmetricEncryptionService extends EncryptionService {
  #ALGORITHM = 'aes-256-cbc'
  #INPUT_ENCODING = 'utf8'
  #OUTPUT_ENCODING = 'hex'
  #RADIX = 16

  encrypt(data, iv = crypto.randomBytes(this.#RADIX)) {
    const cipher = crypto.createCipheriv(this.#ALGORITHM, this.key, iv)
    const encrypted = [cipher.update(data, this.#INPUT_ENCODING, this.#OUTPUT_ENCODING), cipher.final(this.#OUTPUT_ENCODING)].join('')
    const midpoint = encrypted.length / 2
    const [start, end] = [encrypted.slice(0, midpoint), encrypted.slice(midpoint)]

    return forge.util.encode64(`${start}${iv.toString('hex')}${end}`)
  }

  #midpoint(encrypted) { return (encrypted.length - 32) / 2 }

  decrypt(encryptedData) {
    const decoded = forge.util.decode64(encryptedData)
    const midpoint = this.#midpoint(decoded)
    const end = midpoint + 32
    const iv = Buffer.from(decoded.slice(midpoint, end), 'hex')
    const encrypted = `${decoded.slice(0, midpoint)}${decoded.slice(end)}`
    const decipher = crypto.createDecipheriv(this.#ALGORITHM, this.key, iv)
    let decrypted = decipher.update(encrypted, this.#OUTPUT_ENCODING, this.#INPUT_ENCODING)
    decrypted += decipher.final(this.#INPUT_ENCODING)

    return decrypted
  }
}

export default SymmetricEncryptionService
