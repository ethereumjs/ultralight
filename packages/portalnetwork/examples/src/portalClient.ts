import { SignableENR } from '@chainsafe/enr'
import { keys } from '@libp2p/crypto'
import { multiaddr } from '@multiformats/multiaddr'
import { PortalNetwork, NetworkId, TransportLayer } from '../../../portalnetwork/src'
import { PortalConfig } from './config'

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

export async function createNode(port: number): Promise<PortalNetwork> {
  const privateKey = await keys.generateKeyPair('secp256k1')
  const enr = SignableENR.createFromPrivateKey(privateKey)
  const nodeAddr = multiaddr(`/ip4/127.0.0.1/udp/${port}`)
  enr.setLocationMultiaddr(nodeAddr)

  const node = await PortalNetwork.create({
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

export async function sendNetworkMessage(node: PortalNetwork, networkId: NetworkId, messageType: number, payload: any = {}): Promise<any> {
  console.log(`Sending message type ${messageType} to network ${networkId}:`, payload)

  await new Promise(resolve => setTimeout(resolve, 5000))

  const serializedPayload = new TextEncoder().encode(JSON.stringify({
    type: messageType,
    ...payload
  }))

  try {
    const response = await node.sendPortalNetworkMessage(
      node.discv5.enr.toENR(),
      serializedPayload,
      networkId
    )
    return response
  } catch (error) {
    console.error('Failed to send network message:', error)
    throw error
  }
}

export async function executeMethod(node: PortalNetwork, method: string, params: any[]) {
  try {
    const [prefix, methodName] = method.split('_')
    
    if (prefix === 'portal') {

      if (methodName === 'statePing') {
        return await sendNetworkMessage(node, NETWORK_IDS.STATE as NetworkId, MESSAGE_TYPES.PING)
      } else if (methodName === 'historyPing') {
        return await sendNetworkMessage(node, NETWORK_IDS.HISTORY as NetworkId, MESSAGE_TYPES.PING)
      }

      const historyNetwork = node.networks[NetworkId.HistoryNetwork]
      const stateNetwork = node.networks[NetworkId.StateNetwork]
      
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

      if (typeof node[methodName] === 'function') {
        return await node[methodName](...params)
      }
      
      throw new Error(`Unknown method: ${methodName}`)
    }

    throw new Error(`Invalid method prefix: ${prefix}. Must be 'portal'`)
  } catch (error) {
    console.error('Error executing method:', error)
    throw error
  }
}

export async function runPortalClient(config: PortalConfig): Promise<void> {
  let node: PortalNetwork | undefined
  try {
    console.log('Creating Portal Network node...')
    node = await createNode(config.port)
    
    console.log('Starting Portal Network node...')
    await node.start()
    
    console.log('Waiting for node to be ready...')
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    console.log(`Node started on port ${config.port}`)

    node.enableLog('*Portal*,*uTP*,*discv5*')

    // Register SIGINT handler early
    process.on('SIGINT', async () => {
      console.log('Shutting down node...')
      await node?.stop()
      process.exit(0)
    })

    node.on('SendTalkReq', (nodeId, requestId, payload) => 
      console.log('Sent talk request:', { nodeId, requestId, payload }))
    node.on('SendTalkResp', (nodeId, requestId, payload) => 
      console.log('Received talk response:', { nodeId, requestId, payload }))

    const params = JSON.parse(config.params)
    await executeMethod(node, config.method, params)

  } catch (error) {
    console.error('Error:', error)
    await node?.stop?.()
    throw error
  }
}


// export async function runPortalClient(config: PortalConfig): Promise<void> {
//   let node: PortalNetwork | undefined
//   try {
//     console.log('Creating Portal Network node...')
//     node = await createNode(config.port)
    
//     console.log('Starting Portal Network node...')
//     await node.start()
    
//     console.log('Waiting for node to be ready...')
//     await new Promise(resolve => setTimeout(resolve, 5000))
    
//     console.log(`Node started on port ${config.port}`)

//     node.enableLog('*Portal*,*uTP*,*discv5*')

//     node.on('SendTalkReq', (nodeId, requestId, payload) => 
//       console.log('Sent talk request:', { nodeId, requestId, payload }))
//     node.on('SendTalkResp', (nodeId, requestId, payload) => 
//       console.log('Received talk response:', { nodeId, requestId, payload }))

//     const params = JSON.parse(config.params)
//     await executeMethod(node, config.method, params)

//     process.on('SIGINT', async () => {
//       console.log('Shutting down node...')
//       await node?.stop()
//       process.exit(0)
//     })

//   } catch (error) {
//     console.error('Error:', error)
//     await node?.stop?.()
//     throw error
//   }
// }
