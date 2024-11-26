import {expect} from 'chai'

import {formatData} from '../../src/util/dataTools'

describe('dataTools;', () => {
  describe('#formatData', () => {
    it('returns the data when attributes is an empty array', () => {
      const person = {name: 'Lateefat', age: '22', city: 'Lagos'}
      const formattedData = formatData(person)

      expect(formattedData.name).to.equal(person.name)
      expect(formattedData.age).to.equal(person.age)
      expect(formattedData.city).to.equal(person.city)
    })

    it('returns only specified attributes when attributes is not empty', () => {
      const person = {name: 'Lateefat', age: '22', city: 'Lagos'}
      const formattedData = formatData(person, ['age', 'city'])

      expect(formattedData.name).to.not.exist
    })

    it('returns only existing attributes', () => {
      const person = {name: 'Lateefat', age: '22', city: 'Lagos'}
      const formattedData = formatData(person, ['age', 'city', 'country'])

      expect(Object.keys(formattedData)).to.have.length(2)
    })

    it('returns an empty object when attributes are non-existing', () => {
      const person = {name: 'Lateefat', age: '22', city: 'Lagos'}
      const formattedData = formatData(person, ['country', 'hobbies'])

      expect(formattedData).to.eql({})
    })
  })
})
