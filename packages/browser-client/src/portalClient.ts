import { Capacitor } from '@capacitor/core'
import {
  ENR,
  log2Distance,
  PortalNetwork,
  WebSocketTransportService,
  toHexString,
  fromHexString,
  TransportLayer,
} from 'portalnetwork'
import { AppState } from './globalReducer'
import bns from './bootnodes.json'

export const refresh = (state: AppState) => {
  try {
    const known = state.historyProtocol!.routingTable.values()
    const formattedKnown: [number, string, string, string, string][] = known.map((_enr: ENR) => {
      const distToSelf = log2Distance(state.portal!.discv5.enr.nodeId, _enr.nodeId)
      return [
        distToSelf,
        `${_enr.ip}`,
        `${_enr.getLocationMultiaddr('udp')?.nodeAddress().port}`,
        _enr.nodeId,
        _enr.encodeTxt(),
      ]
    })
    const sorted = formattedKnown.sort((a: any, b: any) => a[0] - b[0])
    const table: [number, string[]][] = sorted.map((d) => {
      return [d[0], [d[1], d[2], d[3], d[4]]]
    })
    return {
      ...state,
      peers: known,
      sortedPeers: table,
    }
  } catch {
    return state
  }
}

export const startUp = async (node: PortalNetwork) => {
  // Listen for proxy reflected multiaddr to allow browser client to specify a valid ENR if doing local testing
  if (
    node.discv5.sessionService.transport instanceof WebSocketTransportService &&
    process.env.BINDADDRESS
  ) {
    node.discv5.sessionService.transport.once('multiAddr', (multiaddr) => {
      node.discv5.enr.setLocationMultiaddr(multiaddr)
      // Remove listener after multiAddr received from proxy as this is a one time event
      node.discv5.sessionService.transport.removeAllListeners('multiAddr')
    })
  }

  node.enableLog('*Portal*, -*uTP*, -*FINDNODES*')
  await node.start()
  node.storeNodeDetails()
  ;(window as any).portal = node
  ;(window as any).ENR = ENR
  ;(window as any).hexer = { toHexString, fromHexString }
  node.discv5.on('multiaddrUpdated', () => {
    node.storeNodeDetails()
  })
}
export async function createNodeFromScratch(state: AppState): Promise<PortalNetwork> {
  const node = Capacitor.isNativePlatform()
    ? await PortalNetwork.create({
        bootnodes: bns,
        db: state.LDB as any,
        transport: TransportLayer.MOBILE,
      })
    : await PortalNetwork.create({
        proxyAddress: state.proxy,
        bootnodes: bns,
        db: state.LDB as any,
        transport: TransportLayer.WEB,
      })
  await startUp(node)
  return node
  // const history = node.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
  // return { ...state, portal: node, historyProtocol: history }
}

export async function createNodeFromStorage(state: AppState): Promise<PortalNetwork> {
  const node = Capacitor.isNativePlatform()
    ? await PortalNetwork.create({
        bootnodes: bns,
        db: state.LDB as any,
        rebuildFromMemory: true,
        transport: TransportLayer.MOBILE,
      })
    : await PortalNetwork.create({
        proxyAddress: state.proxy,
        bootnodes: bns,
        db: state.LDB as any,
        rebuildFromMemory: true,
        transport: TransportLayer.WEB,
      })
  await startUp(node)
  return node
}
