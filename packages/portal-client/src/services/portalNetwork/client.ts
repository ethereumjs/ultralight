import { SignableENR } from '@chainsafe/enr'
import { keys } from '@libp2p/crypto'
import { multiaddr } from '@multiformats/multiaddr'
import { PortalNetwork, NetworkId, TransportLayer } from 'portalnetwork'
import { DEFAULT_BOOTNODES } from 'portalnetwork/dist/util/bootnodes'
import { TauriUDPTransportService } from './transportService'

// Adapt your TauriUDPTransportService to match the TransportLayer interface
const adaptTransport = (transport: TauriUDPTransportService): TransportLayer => {
  return {
    start: transport.start.bind(transport),
    stop: transport.stop.bind(transport),
    send: transport.send.bind(transport),
    getContactableAddr: transport.getContactableAddr.bind(transport),
    on: transport.on.bind(transport),
    addExpectedResponse: transport.addExpectedResponse?.bind(transport),
    removeExpectedResponse: transport.removeExpectedResponse?.bind(transport),
  } as unknown as TransportLayer;
};

export async function createPortalClient(port = 9090) {

  const nodeAddr = multiaddr(`/ip4/0.0.0.0/udp/${port}`)
  
  const privateKey = await keys.generateKeyPair('secp256k1')
  const enr = SignableENR.createFromPrivateKey(privateKey)
  
  enr.setLocationMultiaddr(nodeAddr)
  
  const udpTransport = new TauriUDPTransportService(nodeAddr, enr.nodeId)
  const transport = adaptTransport(udpTransport)
    
  const node = await PortalNetwork.create({
    transport,
    supportedNetworks: [
      { networkId: NetworkId.HistoryNetwork },
      { networkId: NetworkId.StateNetwork },
    ],
    config: {
      enr,
      bindAddrs: { ip4: nodeAddr },
      privateKey,
    },
    bootnodes: DEFAULT_BOOTNODES.mainnet,
  })
    
  await node.start();
  
  return node
}


// import { SignableENR } from '@chainsafe/enr'
// import { keys } from '@libp2p/crypto'
// import { multiaddr } from '@multiformats/multiaddr'
// import { PortalNetwork, NetworkId } from 'portalnetwork'
// import { DEFAULT_BOOTNODES } from 'portalnetwork/dist/util/bootnodes'
// import { TauriUDPTransportService } from './transportService'

// // const portalClientDebugString = 'PortalClient'

// export async function createPortalClient(port = 9090) {
//   const nodeAddr = multiaddr(`/ip4/0.0.0.0/udp/${port}`)

//   const privateKey = await keys.generateKeyPair('secp256k1')
//   const enr = SignableENR.createFromPrivateKey(privateKey)

//   enr.setLocationMultiaddr(nodeAddr)

//   const transport = new TauriUDPTransportService(nodeAddr, enr.nodeId)
  
//   const node = await PortalNetwork.create({
//         transport,
//         supportedNetworks: [
//           { networkId: NetworkId.HistoryNetwork },
//           { networkId: NetworkId.StateNetwork },
//         ],
//         config: {
//           enr,
//           bindAddrs: { ip4: nodeAddr },
//           privateKey,
//         },
//         bootnodes: DEFAULT_BOOTNODES.mainnet,
//       })


//       await node.start();
  
//   return node
// }
