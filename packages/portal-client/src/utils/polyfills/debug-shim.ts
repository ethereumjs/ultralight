const debugShim = (namespace: string) => {
  const log = (...args: any[]) => {
    console.log(`[${namespace}]`, ...args)
  }

  log.enable = () => {}
  log.disable = () => {}
  log.extend = (subNamespace: string) => {
    return debugShim(`${namespace}:${subNamespace}`)
  }

  return log
}

export default debugShim
