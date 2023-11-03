import { ethers } from 'ethers'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

export class MockProvider extends ethers.JsonRpcProvider {
  _getConnection(): ethers.FetchRequest {
    return undefined as any
  }
  send = async (method: string, params: Array<any>) => {
    switch (method) {
      case 'eth_getBlockByNumber':
        return this.getBlockValues(params as any)
      case 'eth_getBlockByHash':
        return this.getBlockValues(params as any)
      case 'eth_chainId': // Always pretends to be mainnet
        return 1
      default:
        throw new Error(`method ${method} not implemented`)
    }
  }

  _send = async (
    payload: ethers.JsonRpcPayload | ethers.JsonRpcPayload[],
  ): Promise<ethers.JsonRpcResult[]> => {
    payload = payload as ethers.JsonRpcPayload
    const res = await this.send(payload.method, payload.params as any)
    return [
      {
        result: res,
        id: payload.id,
      },
    ]
  }
  private getBlockValues = async (params: [blockTag: string, _: boolean]) => {
    const [blockTag, _] = params
    if (blockTag.slice(0, 2) !== '0x')
      return {
        number: 'latest',
        stateRoot: '0x2ffb7ec5bbe8616c24a222737f0817f389d00ab9268f9574e0b7dfe251fbfa05',
      }
    const block = require(`./blocks/block${blockTag.toString()}.json`)
    return block
  }
}
