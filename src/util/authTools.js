import jwt from 'jsonwebtoken'

export const userToken = (user, expiresIn = '1h') => jwt.sign(
  {id: user.id, roleId: user.RoleId},
  process.env.SECRET,
  {expiresIn}
)

export const verifyToken = token => jwt.verify(token, process.env.SECRET)
