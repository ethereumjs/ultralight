export const shortId = (nodeId: string) => {
    return nodeId.slice(0, 5) + '...' + nodeId.slice(nodeId.length - 5)
}