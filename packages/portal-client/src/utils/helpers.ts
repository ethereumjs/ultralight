export const formatJsonRpcPayload = (params: any[]): [string, boolean] => {

  if (!params || !params[0]) {
    throw new Error('Missing payload parameter')
  }

  let payload = params[0]
  if (typeof payload === 'string' && !payload.startsWith('0x')) {
    try {
      payload = '0x' + parseInt(payload, 10).toString(16)
    } catch (e) {
      throw new Error('Invalid block number format')
    }
  }
  
  const includeTx = params.length > 1 ? !!params[1] : false
 
  return [payload, includeTx]
}