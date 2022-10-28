export const isValidId = (nodeId: string) => {
  return /[^a-z0-9\s]+/.test(nodeId) || nodeId.length !== 64 ? false : true
}
