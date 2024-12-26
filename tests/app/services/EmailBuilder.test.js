import {expect} from 'chai'
import {fakerYO_NG as faker} from '@faker-js/faker'

import EmailBuilder from '../../../src/app/services/EmailBuilder'

const email = faker.internet.email()
const paragraphs = [faker.lorem.text(), faker.lorem.text()]

describe('EmailBuilder:', () => {
  describe('#build', () => {
    it('builds email object if initialized without data', () => {
      const emailBuilder = new EmailBuilder()
      const payload = emailBuilder.build()

      expect(Object.keys(payload)).to.deep.equal(['from', 'html', 'text'])
      expect(payload.text).to.equal('Thank you!')
    })

    it('builds an email object correctly', () => {
      const emailBuilder = new EmailBuilder({to: email}, paragraphs)
      const payload = emailBuilder.build()
      const [first, last] = paragraphs

      expect(Object.keys(payload)).to.deep.equal(['from', 'to', 'html', 'text'])
      expect(payload.to).to.equal(email)
      expect(payload.text).to.includes(first)
      expect(payload.text).to.includes(last)
      expect(payload.text).to.includes('Thank you')
    })

    it('does not include signature when signature is false', () => {
      const emailBuilder = new EmailBuilder({to: email, signature: false}, paragraphs)
      const payload = emailBuilder.build()
      const [first, last] = paragraphs

      expect(Object.keys(payload)).to.deep.equal(['from', 'to', 'html', 'text'])
      expect(payload.to).to.equal(email)
      expect(payload.text).to.includes(first)
      expect(payload.text).to.includes(last)
      expect(payload.text).to.not.includes('Thank you')
    })
  })
})
