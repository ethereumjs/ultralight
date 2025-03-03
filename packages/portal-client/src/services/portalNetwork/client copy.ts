console.log('before any import import in client');
import { SignableENR } from '@chainsafe/enr'
import { keys } from '@libp2p/crypto'
import { multiaddr } from '@multiformats/multiaddr'
import { PortalNetwork, NetworkId, TransportLayer } from 'portalnetwork'
import { DEFAULT_BOOTNODES } from 'portalnetwork/dist/util/bootnodes'
import { TauriUDPTransportService } from './transportService'
console.log('before wasm import in client');
import bls, { init as blsInit } from "@chainsafe/bls/switchable"
console.log('BLS module:', bls);
async function initializeBls() {
  try {
    console.log('Initializing BLS library...');
    await blsInit("herumi"); // Initialize the BLS library with the herumi implementation
    console.log('BLS library initialized successfully');
  } catch (error) {
    console.error('Failed to initialize BLS library:', error);
  }
}

const adaptTransport = (transport: TauriUDPTransportService): TransportLayer => {
  return {
    start: transport.start.bind(transport),
    stop: transport.stop.bind(transport),
    send: transport.send.bind(transport),
    getContactableAddr: transport.getContactableAddr.bind(transport),
    on: transport.on.bind(transport),
    addExpectedResponse: transport.addExpectedResponse?.bind(transport),
    removeExpectedResponse: transport.removeExpectedResponse?.bind(transport),
  } as unknown as TransportLayer
}

export async function createPortalClient(port = 9090) {
  await initializeBls();
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

  await node.start()

  return node
}
