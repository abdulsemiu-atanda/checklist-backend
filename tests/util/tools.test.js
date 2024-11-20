import {expect} from 'chai'

import * as tools from '../../src/util/tools'

describe('tools', () => {
  describe('#dateToISOString', () => {
    it('converts valid date string to ISO string', () => {
      const dateString = '2023-09-11'

      expect(tools.dateToISOString('2023-09-11')).to.not.have.length(dateString.length)
    })
  })

  describe('#dasherizeCamelCase', () => {
    it('dasherize camel and pascal case correctly', () => {
      expect(tools.dasherizeCamelCase('dateTools')).to.equal('date-tools')
      expect(tools.dasherizeCamelCase('PascalCase')).to.equal('pascal-case')
    })

    it('does not affect non camel case words', () => {
      expect(tools.dasherizeCamelCase('soup')).to.equal('soup')
      expect(tools.dasherizeCamelCase('snake_case')).to.equal('snake_case')
    })
  })
})
