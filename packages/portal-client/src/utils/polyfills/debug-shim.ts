const debugShim = (namespace: string) => {
  return (...args: any[]) => {
    console.log(`[${namespace}]`, ...args)
  }
}

debugShim.enable = () => {}
debugShim.disable = () => {}

export default debugShim