import {redisKeystore} from '../src/util/tools'
import {userToken} from '../src/util/authTools'

export const tokenGenerator = async ({user, password}) => {
  const keystore = redisKeystore()

  if (process.env.NODE_ENV === 'test') {
    await keystore.insert({key: user.id, value: password})

    return userToken(user)
  } else {
    throw new Error('tokenGenerator should only be used in test environment.')
  }
}
