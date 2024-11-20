import {fakerYO_NG as faker} from '@faker-js/faker'

export const fakeUser = {
  email: faker.internet.email(),
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  password: faker.internet.password()
}
