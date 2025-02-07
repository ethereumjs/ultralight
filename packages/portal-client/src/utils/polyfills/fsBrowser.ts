const fs = {
  readFileSync: () => {
    throw new Error('fs.readFileSync is not supported in the browser.')
  },
  writeFileSync: () => {
    throw new Error('fs.writeFileSync is not supported in the browser.')
  },
}

export default fs

export const promises = {
  readFile: async () => {
    throw new Error('fs.promises.readFile is not supported in the browser.')
  },
  writeFile: async () => {
    throw new Error('fs.promises.writeFile is not supported in the browser.')
  },
}
