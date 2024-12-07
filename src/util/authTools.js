import jwt from 'jsonwebtoken'

export const userToken = (user, expiresIn = '1h') => jwt.sign(
  {id: user.id, roleId: user.RoleId},
  process.env.SECRET,
  {expiresIn}
)

export const verifyToken = token => jwt.verify(token, process.env.SECRET)

export const generateCode = (size = 6, code = '') => {
  const digits = '0123456789'
  const position = Math.floor(Math.random() * 10)

  if (code.length === size)
    return code
  else
    return generateCode(size, `${code}${digits[position]}`)
}
