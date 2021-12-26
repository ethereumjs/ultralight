export const methods = {
    'discv5_sendPing': async (params: any) => {
        console.log('[RPC] discv5_sendPing request received:')
        console.log(params)
        return 'ok'
    },
}
