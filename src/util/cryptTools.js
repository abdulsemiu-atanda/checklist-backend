import crypto from 'crypto'

export const digest = data => crypto.createHash('sha256').update(data).digest('base64')
