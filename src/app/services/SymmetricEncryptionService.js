import crypto from 'crypto'
import EncryptionService from './EncryptionService'

class SymmetricEncryptionService extends EncryptionService {
  #ALGORITHM = 'aes-256-cbc'
  #INPUT_ENCODING = 'utf8'
  #OUTPUT_ENCODING = 'hex'
  #RADIX = 8

  encrypt(data, iv = crypto.randomBytes(this.#RADIX).toString(this.#OUTPUT_ENCODING)) {
    const cipher = crypto.createCipheriv(this.#ALGORITHM, this.key, Buffer.from(iv))
    let encrypted = cipher.update(data, this.#INPUT_ENCODING, this.#OUTPUT_ENCODING)
    encrypted += cipher.final(this.#OUTPUT_ENCODING)

    return `${iv}${encrypted}`
  }

  decrypt(encryptedData) {
    const iv = encryptedData.slice(0,16)
    const encrypted = encryptedData.slice(16)
    const decipher = crypto.createDecipheriv(this.#ALGORITHM, this.key, Buffer.from(iv))
    let decrypted = decipher.update(encrypted, this.#OUTPUT_ENCODING, this.#INPUT_ENCODING)
    decrypted += decipher.final(this.#INPUT_ENCODING)

    return decrypted
  }
}

export default SymmetricEncryptionService
