export const dateToISOString = date => (new Date(date)).toISOString()

export const dasherizeCamelCase = (word) =>
  word.replace(/([a-zA-Z])(?=[A-Z])/g, '$1-').toLowerCase()
