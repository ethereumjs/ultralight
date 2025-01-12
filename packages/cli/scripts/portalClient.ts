import { SignableENR } from '@chainsafe/enr'
import { keys } from '@libp2p/crypto'
import { multiaddr } from '@multiformats/multiaddr'
import { UltralightProvider } from '../../portalnetwork/src/client/provider'
import { TransportLayer, NetworkId } from '../../portalnetwork/src/index'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

const args = await yargs(hideBin(process.argv))
  .option('method', {
    describe: 'Portal Network method to call',
    type: 'string',
    required: true,
  })
  .option('params', {
    describe: 'Parameters for the method (JSON string)',
    type: 'string',
    default: '[]',
  })
  .option('port', {
    describe: 'Port number for the node',
    type: 'number',
    default: 9090,
  })
  .example('$0 --method portal_statePing --params "[\\"enr:-...\\"]"', 'Ping a state network node')
  .strict()
  .argv


const NETWORK_IDS = {
  STATE: '0x500a',
  HISTORY: '0x500b',
  BEACON: '0x500c',
}

const MESSAGE_TYPES = {
  PING: 0,
  PONG: 1,
  FINDNODES: 2,
  NODES: 3,
  TALKREQ: 4,
  TALKRESP: 5,
}

async function createNode(port: number): Promise<UltralightProvider> {
  const privateKey = await keys.generateKeyPair('secp256k1')
  const enr = SignableENR.createFromPrivateKey(privateKey)
  const nodeAddr = multiaddr(`/ip4/127.0.0.1/udp/${port}`)
  enr.setLocationMultiaddr(nodeAddr)

  const node = await UltralightProvider.create({
    transport: TransportLayer.NODE,
    supportedNetworks: [
      { networkId: NetworkId.HistoryNetwork },
      { networkId: NetworkId.StateNetwork },
    ],
    config: {
      enr,
      bindAddrs: { ip4: nodeAddr },
      privateKey,
    },

  })

  return node
}

async function sendNetworkMessage(node: UltralightProvider, networkId: NetworkId, messageType: number, payload: any = {}): Promise<any> {
  console.log(`Sending message type ${messageType} to network ${networkId}:`, payload) 

  await new Promise(resolve => setTimeout(resolve, 5000))

  const serializedPayload = new TextEncoder().encode(JSON.stringify({
    type: messageType,
    ...payload
  }))

  try {
    const response = await node.portal.sendPortalNetworkMessage(
      node.portal.discv5.enr.toENR(),
      serializedPayload,
      networkId
    ) 
    return response
  } catch (error) {
    console.error('Failed to send network message:', error)
    throw error
  }
}

async function executeMethod(node: UltralightProvider, method: string, params: any[]) {
  try {
    const [prefix, methodName] = method.split('_')
    
    if (prefix === 'portal') {

      if (methodName === 'statePing') {
        return await sendNetworkMessage(node, NETWORK_IDS.STATE as NetworkId, MESSAGE_TYPES.PING)
      } else if (methodName === 'historyPing') {
        return await sendNetworkMessage(node, NETWORK_IDS.HISTORY as NetworkId, MESSAGE_TYPES.PING)
      }

      const historyNetwork = node.portal.network()[NetworkId.HistoryNetwork]
      const stateNetwork = node.portal.network()[NetworkId.StateNetwork]
      
      if (historyNetwork && methodName.startsWith('history')) {
        const networkMethod = methodName.replace('history', '').toLowerCase()
        if (typeof historyNetwork[networkMethod] === 'function') {
          return await historyNetwork[networkMethod](...params)
        }
      }

      if (stateNetwork && methodName.startsWith('state')) {
        const networkMethod = methodName.replace('state', '').toLowerCase()
        if (typeof stateNetwork[networkMethod] === 'function') {
          return await stateNetwork[networkMethod](...params)
        }
      }

      if (typeof node.portal[methodName] === 'function') {
        return await node.portal[methodName](...params)
      }
      
      throw new Error(`Unknown method: ${methodName}`)
    }

    throw new Error(`Invalid method prefix: ${prefix}. Must be 'portal'`)
  } catch (error) {
    console.error('Error executing method:', error)
    throw error
  }
}

async function main() {
  let node: UltralightProvider | undefined
  try {
    console.log('Creating Portal Network node...')
    node = await createNode(args.port)
    
    console.log('Starting Portal Network node...')
    await node.portal.start()
    
    console.log('Waiting for node to be ready...')
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    console.log(`Node started on port ${args.port}`)

    node.portal.enableLog('*Portal*,*uTP*,*discv5*')

    node.portal.on('SendTalkReq', (nodeId, requestId, payload) => 
      console.log('Sent talk request:', { nodeId, requestId, payload }))
    node.portal.on('SendTalkResp', (nodeId, requestId, payload) => 
      console.log('Received talk response:', { nodeId, requestId, payload }))

    const params = JSON.parse(args.params)
    await executeMethod(node, args.method, params)

    process.on('SIGINT', async () => {
      console.log('Shutting down node...')
      await node?.portal.stop()
      process.exit(0)
    })

  } catch (error) {
    console.error('Error:', error)
    await node?.portal?.stop?.()
    process.exit(1)
  }
}

main().catch(console.error)