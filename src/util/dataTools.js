export const formatData = (data, attributes = []) => {
  const existingAttributes = attributes.filter(property => Object.keys(data).includes(property))

  if (attributes.length === 0 || existingAttributes.length === 0)
    return data
  else
    return existingAttributes.reduce((accumulator, key) => ({...accumulator, [key]: data[key]}), {})
}
