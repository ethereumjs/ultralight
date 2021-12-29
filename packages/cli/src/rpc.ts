import debug from 'debug'

const log = debug('RPC')

export const methods = {
    'discv5_nodeInfo': async () => {
        log('discv5_nodeInfo request received')
        return 'Ultralight-CLI: v0.0.1'
    },
    'eth_getBlockByHash': async (params: [string, boolean]) => {
        const [blockHash, includeTransactions] = params
        log(`eth_getBlockByHash request received. blockHash: ${ blockHash } includeTransactions: ${ includeTransactions }`)
        return 'Ultralight-CLI: v0.0.1'
    }
}
