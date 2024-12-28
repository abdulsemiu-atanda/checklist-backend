import crypto from 'crypto'
import forge from 'node-forge'

export const digest = data => crypto.createHash('sha256').update(data).digest('base64')

/**
 * Decrypts an encrypted private key
 * @param {String} encryptedPrivateKey
 * @param {String} passphrase
 * @returns {String} PEM formatted RSA Private Key
 */
export const decryptRSAPrivateKey = (encryptedPrivateKey, passphrase) =>
  forge.pki.decryptRsaPrivateKey(encryptedPrivateKey, passphrase)

/**
 * Encrypts forge private key
 * @param {Object} privateKey
 * @param {String} passphrase
 * @returns {String} PEM formatted encrypted private key
 */
export const encryptRSAPrivateKey = ({privateKey, passphrase}) =>
  forge.pki.encryptRsaPrivateKey(privateKey, passphrase)

export const secureHash = value =>
  crypto.createHmac('sha256', process.env.ENCRYPTION_KEY).update(value).digest('hex')

export const keyFingerprint = (key, delimiter = ':') =>
  secureHash(key).match(/\w{2}/g).join(delimiter).toUpperCase()

export const formatPublicKey = publicKey =>
  publicKey.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----/g, '')

/**
 * Generates a PEM public/private keypair
 * @param {String} passphrase
 * @returns {Promise<{publicKey: String, privateKey: String, backupKey: String, SHAFingerprint: String}>}
 */
export const generateKeyPair = passphrase => new Promise((resolve, reject) => {
  crypto.generateKeyPair('rsa', {
    modulusLength: 4096,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
      cipher: 'aes-256-cbc',
      passphrase
    },
  }, (error, publicKey, encryptedPrivateKey) => {
    if (error) {
      reject(error)
    } else {
      const backupKey = forge.util.encode64(encryptRSAPrivateKey({
        privateKey: decryptRSAPrivateKey(encryptedPrivateKey, passphrase),
        passphrase: process.env.ENCRYPTION_KEY
      }))

      resolve({
        publicKey,
        privateKey: forge.util.encode64(encryptedPrivateKey),
        backupKey,
        SHAFingerprint: keyFingerprint(formatPublicKey(publicKey))
      })
    }
  })
})
