import crypto from 'crypto'
import EncryptionService from './EncryptionService'

class SymmetricEncryptionService extends EncryptionService {
  #ALGORITHM = 'AES-GCM'
  #RADIX = 16

  async encrypt(data) {
    const encodedData = new TextEncoder().encode(data)
    const keyHash = await this.digest()
    const importedKey = await crypto.subtle.importKey('raw', keyHash, {name: this.#ALGORITHM}, false, ['encrypt']);
    const encryptedData = await crypto.subtle.encrypt(
      {name: this.#ALGORITHM, iv: this.iv},
      importedKey,
      encodedData
    )
    const encryptedDataArray = Array.from(new Uint8Array(encryptedData))
    const bytesToString = encryptedDataArray.map(byte => String.fromCharCode(byte)).join('')
    const ivHex = Array.from(this.iv).map(byte => ('00' + byte.toString(this.#RADIX)).slice(-2)).join('')

    return `${ivHex}${btoa(bytesToString)}`
  }

  async decrypt(encryptedData) {
    const keyHash = await this.digest()
    const iv = new Uint8Array(encryptedData.slice(0,24).match(/.{2}/g).map(byte => parseInt(byte, this.#RADIX)))
    const importedKey = await crypto.subtle.importKey('raw', keyHash, {name: this.#ALGORITHM}, false, ['decrypt']);
    const cipher = new Uint8Array(atob(encryptedData.slice(24)).match(/[\s\S]/g).map(ch => ch.charCodeAt(0)))
    const decrypted = await crypto.subtle.decrypt(
      {name: this.#ALGORITHM, iv},
      importedKey,
      cipher
    )

    return new TextDecoder().decode(decrypted)
  }
}

export default SymmetricEncryptionService
