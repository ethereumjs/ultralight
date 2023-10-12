import { initTRPC } from '@trpc/server'
// eslint-disable-next-line node/file-extension-in-import
import { createHTTPServer } from '@trpc/server/adapters/standalone'
import cors from 'cors'
import jayson from 'jayson/promise/index.js'
import { ENR, SignableENR } from '@chainsafe/discv5'
import { createSecp256k1PeerId } from '@libp2p/peer-id-factory'
import { multiaddr } from '@multiformats/multiaddr'
import { execSync } from 'child_process'
import { HistoryProtocol, PortalNetwork, ProtocolId } from 'portalnetwork'

import ws from 'ws'

// eslint-disable-next-line node/file-extension-in-import
import { applyWSSHandler } from '@trpc/server/adapters/ws'
import { subscriptions } from './subscriptions.js'
import { websocketProcedures } from './procedures.js'
import { httpProcedures } from './rpc/procedures.js'
import { z_Enr } from './rpc/trpcTypes.js'
import { z } from 'zod'

const main = async () => {
  const t = initTRPC
    .context()
    .meta<{
      description: string
    }>()
    .create()
  const publicProcedure = t.procedure
  const cmd = 'hostname -I'
  const pubIp = execSync(cmd).toString().split(' ')[0]
  console.log('pubIp', pubIp)
  const id = await createSecp256k1PeerId()
  const enr = SignableENR.createFromPeerId(id)
  const initMa: any = multiaddr(`/ip4/${pubIp}/udp/8546`)
  enr.setLocationMultiaddr(initMa)
  const config = {
    enr: enr,
    peerId: id,
    config: {
      enrUpdate: true,
      addrVotesToUpdateEnr: 5,
      allowUnverifiedSessions: true,
    },
    bindAddrs: {
      ip4: initMa,
    },
  } as any
  const portal = await PortalNetwork.create({
    config: config,
    radius: 2n ** 256n - 1n,
    supportedProtocols: [ProtocolId.HistoryNetwork],
  })
  portal.discv5.enableLogs()
  portal.enableLog('*')

  const history = portal.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
  const router = t.router

  const clientA = jayson.Client.http({
    host: '192.168.86.29',
    port: 8545,
  })
  const clients: Record<number, jayson.HttpClient> = {
    8545: clientA,
  }

  //  WSS Client Methods

  const decodeENR = publicProcedure
    .input(z_Enr)
    .output(
      z.object({
        nodeId: z.string(),
        multiaddr: z.string(),
        c: z.string(),
      }),
    )
    .mutation(({ input }) => {
      const enr = ENR.decodeTxt(input)
      const tag = enr.kvs.get('c')
      const c = tag ? tag.toString() : ''
      const nodeId = enr.nodeId
      const multiaddr = enr.getLocationMultiaddr('udp')?.toString() ?? ''
      return {
        nodeId,
        multiaddr,
        c,
      }
    })

  const { onTalkReq, onTalkResp, onContentAdded, onNodeAdded, onSendTalkReq, onSendTalkResp } =
    await subscriptions(portal, history, publicProcedure)

  const {
    browser_nodeInfo,
    local_routingTable,
    ping,
    pingBootNodes,
    browser_historyStore,
    browser_historyLocalContent,
  } = websocketProcedures(portal, publicProcedure)

  /**
   * HTTP Client Methods
   */

  const {
    portal_historyRoutingTableInfo,
    portal_historyPing,
    discv5_nodeInfo,
    pingBootNodeHTTP,
    portal_historyStore,
  } = httpProcedures(publicProcedure, pubIp)

  // Create tRpc Router

  const appRouter = router({
    decodeENR,
    onTalkReq,
    onTalkResp,
    onSendTalkReq,
    onSendTalkResp,
    onContentAdded,
    onNodeAdded,
    browser_nodeInfo,
    local_routingTable,
    ping,
    pingBootNodes,
    discv5_nodeInfo,
    portal_historyRoutingTableInfo,
    portal_historyPing,
    portal_historyStore,
    browser_historyStore,
    browser_historyLocalContent,
    pingBootNodeHTTP,
  })

  // export only the type definition of the API
  // None of the actual implementation is exposed to the client

  const wss = new ws.Server({
    port: 3001,
  })
  const handler = applyWSSHandler({
    wss,
    router: appRouter,
    createContext() {
      console.log('context 4')
      return {}
    },
  })
  wss.on('connection', (ws) => {
    console.log(`➕➕ Connection (${wss.clients.size})`)
    ws.once('close', () => {
      console.log(`➖➖ Connection (${wss.clients.size})`)
    })
  })
  console.log('✅ WebSocket Server listening on ws://localhost:3001')
  process.on('SIGTERM', () => {
    console.log('SIGTERM')
    handler.broadcastReconnectNotification()
    wss.close()
  })
  portal.discv5.enableLogs()

  portal.enableLog('*ultralight*, *LightClient*, -OFFER, -ACCEPT, *ultralight:RPC*')

  await portal.start()

  console.log('nodeId', portal.discv5.enr.encodeTxt())
  console.log('nodeId', portal.discv5.enr.nodeId)

  console.log('browser_nodeInfo', JSON.stringify(appRouter.browser_nodeInfo._def))
  console.log('browser_nodeInfo', JSON.stringify(appRouter.ping._def))

  // create server
  createHTTPServer({
    middleware: cors(),
    router: appRouter,
    createContext() {
      console.log('context 3')
      return {}
    },
  }).listen(8546)
}
main()
