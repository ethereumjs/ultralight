import tape from 'tape'
import { spawn, ChildProcessWithoutNullStreams } from 'child_process'
import { multiaddr } from '@multiformats/multiaddr'
import { PortalNetwork, ProtocolId } from '../../src/index.js'
import { TransportLayer } from '../../src/client/types.js'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

export const end = async (
  child: ChildProcessWithoutNullStreams,
  nodes: PortalNetwork[],
  st: tape.Test
) => {
  nodes[0].removeAllListeners()
  nodes[1].removeAllListeners()
  child.stdout.removeAllListeners()
  child.kill('SIGINT')
  nodes.forEach(async (node) => await node.stop())
  st.end()
}

export const setupNetwork = async () => {
  const portal1 = await PortalNetwork.create({
    bindAddress: '127.0.0.1',
    transport: TransportLayer.WEB,
    supportedProtocols: [ProtocolId.HistoryNetwork, ProtocolId.UTPNetwork],
    //@ts-ignore
    config: {
      config: {
        enrUpdate: true,
        addrVotesToUpdateEnr: 1,
      },
    },
  })
  const portal2 = await PortalNetwork.create({
    bindAddress: '127.0.0.1',
    transport: TransportLayer.WEB,
    supportedProtocols: [ProtocolId.HistoryNetwork, ProtocolId.UTPNetwork],
    //@ts-ignore
    config: {
      config: {
        enrUpdate: true,
        addrVotesToUpdateEnr: 1,
      },
    },
  })
  return [portal1, portal2]
}

export function connectAndTest(
  t: tape.Test,
  st: tape.Test,
  testFunction: (
    portal1: PortalNetwork,
    portal2: PortalNetwork,
    child: ChildProcessWithoutNullStreams
  ) => Promise<void>,
  ends?: boolean
) {
  const file = require.resolve('../../../proxy/dist/index.js')
  const child = spawn(process.execPath, [file])
  let portal1: PortalNetwork
  let portal2: PortalNetwork
  child.stderr.on('data', async (data) => {
    if (data.toString().includes('Error: listen EADDRINUSE')) {
      // Terminate test process early if proxy can't start or tape will hang
      t.fail('proxy did not start successfully')
      process.exit(0)
    }

    if (data.toString().includes('websocket server listening on 127.0.0.1:5050')) {
      const nodes = await setupNetwork()
      portal1 = nodes[0]
      portal2 = nodes[1]
      // portal1.enableLog('*Portal*, -*NODES*')
      // portal2.enableLog('*Portal*, -*NODES*')
      await portal1.start()
    } else if (data.toString().includes('UDP proxy listening on')) {
      const port = parseInt(data.toString().split('UDP proxy listening on  127.0.0.1')[1])
      if (!portal2.discv5.isStarted()) {
        portal1.discv5.enr.setLocationMultiaddr(multiaddr(`/ip4/127.0.0.1/udp/${port}`))
        await portal2.start()
      } else if (portal2.discv5.isStarted()) {
        portal2.discv5.enr.setLocationMultiaddr(multiaddr(`/ip4/127.0.0.1/udp/${port}`))
        await testFunction(portal1, portal2, child)
        if (!ends) {
          await end(child, [portal1, portal2], st)
        }
      }
    }
  })
}
