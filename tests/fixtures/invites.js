import {fakerYO_NG as faker} from '@faker-js/faker'

export const fakeInvite = {
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  email: faker.internet.email()
}

export const collaborator = {
  ...fakeInvite,
  email: faker.internet.email(),
  password: faker.internet.password()
}
