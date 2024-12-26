import forge from 'node-forge'

import {generateKeyPair, formatPublicKey, keyFingerprint, decryptRSAPrivateKey} from '../../util/cryptTools'
import EncryptionService from './EncryptionService'

class AsymmetricEncryptionService extends EncryptionService {
  #ENCRYPTION_SCHEME = 'RSA-OAEP'

  constructor(passphrase) {
    super(passphrase, 'asymmetric')
  }

  generateKeyPair() { return generateKeyPair(this.key) }

  encrypt({publicKey, data, fingerprint}) {
    if (fingerprint === keyFingerprint(formatPublicKey(publicKey))) {
      const forgePublicKey = forge.pki.publicKeyFromPem(publicKey)
      const encrypted = forgePublicKey.encrypt(data, this.#ENCRYPTION_SCHEME, {
        md: forge.md.sha256.create(),
        mgf1: {
          md: forge.md.sha1.create()
        }
      })

      return forge.util.encode64(encrypted)
    } else {
      throw new Error('[ENCRYPTION_ERROR] Unable to verify public key with provided fingerprint')
    }
  }

  decrypt({privateKey, encrypted}) {
    return decryptRSAPrivateKey(privateKey, this.key).decrypt(
      forge.util.decode64(encrypted),
      this.#ENCRYPTION_SCHEME,
      {
        md: forge.md.sha256.create(),
        mgf1: {
          md: forge.md.sha1.create()
        }
      }
    )
  }
}

export default AsymmetricEncryptionService
