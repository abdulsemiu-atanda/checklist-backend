export const formatData = (data, attributes = []) => {
  if (attributes.length === 0) {
    return data
  } else {
    return attributes.reduce((accumulator, key) => {
      if (data[key])
        return {...accumulator, [key]: data[key]}
      else
        return accumulator
    }, {})
  }
}