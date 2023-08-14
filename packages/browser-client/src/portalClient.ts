import { Capacitor } from '@capacitor/core'
import { ethers } from 'ethers'
import {
  ENR,
  log2Distance,
  WebSocketTransportService,
  toHexString,
  fromHexString,
  TransportLayer,
  UltralightProvider,
} from 'portalnetwork'
import { AppState } from './globalReducer'
import bns from './bootnodes.json'

export const refresh = (state: AppState) => {
  try {
    const known = state.provider!.historyProtocol!.routingTable.values()
    const formattedKnown: [number, string, string, string, string][] = known.map((_enr: ENR) => {
      const distToSelf = log2Distance(state.provider!.portal.discv5.enr.nodeId, _enr.nodeId)
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

export const startUp = async (provider: UltralightProvider) => {
  // Listen for proxy reflected multiaddr to allow browser client to specify a valid ENR if doing local testing

  if (provider.portal.discv5.sessionService.transport instanceof WebSocketTransportService) {
    provider.portal.discv5.sessionService.transport.once('multiAddr', (multiaddr) => {
      provider.portal.discv5.enr.setLocationMultiaddr(multiaddr)
      provider.portal.discv5.emit('multiaddrUpdated', multiaddr)

      // Remove listener after multiAddr received from proxy as this is a one time event
      provider.portal.discv5.sessionService.transport.removeAllListeners('multiAddr')
    })
  }

  provider.portal.enableLog('*')
  await provider.portal.start()
  provider.portal.storeNodeDetails()
  ;(window as any).portal = provider.portal
  ;(window as any).ENR = ENR
  ;(window as any).hexer = { toHexString, fromHexString }
  provider.portal.discv5.on('multiaddrUpdated', () => {
    provider.portal.storeNodeDetails()
  })
}
export async function createNodeFromScratch(state: AppState): Promise<UltralightProvider> {
  const provider = Capacitor.isNativePlatform()
    ? await UltralightProvider.create(new ethers.providers.CloudflareProvider(), 1, {
        bootnodes: bns,
        db: state.LDB as any,
        transport: TransportLayer.MOBILE,
      })
    : await UltralightProvider.create(new ethers.providers.CloudflareProvider(), 1, {
        proxyAddress: state.proxy,
        bootnodes: bns,
        db: state.LDB as any,
        transport: TransportLayer.WEB,
      })
  await startUp(provider)
  return provider
}

export async function createNodeFromStorage(state: AppState): Promise<UltralightProvider> {
  const provider = Capacitor.isNativePlatform()
    ? await UltralightProvider.create(new ethers.providers.CloudflareProvider(), 1, {
        bootnodes: bns,
        db: state.LDB as any,
        rebuildFromMemory: true,
        transport: TransportLayer.MOBILE,
      })
    : await UltralightProvider.create(new ethers.providers.CloudflareProvider(), 1, {
        proxyAddress: state.proxy,
        bootnodes: bns,
        db: state.LDB as any,
        rebuildFromMemory: true,
        transport: TransportLayer.WEB,
      })
  await startUp(provider)
  return provider
}
