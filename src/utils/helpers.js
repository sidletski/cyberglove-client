export const optionsToObject = (options) => {
  const obj = {}

  options.forEach(({ key, isDefault }) => {
    obj[key] = isDefault ? true : false
  })

  return obj
}
