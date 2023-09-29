import { initTRPC } from '@trpc/server'
// eslint-disable-next-line node/file-extension-in-import
import { createHTTPServer } from '@trpc/server/adapters/standalone'
import cors from 'cors'
import { z } from 'zod'
import jayson from 'jayson/promise/index.js'
import { Discv5EventEmitter, ENR, SignableENR } from '@chainsafe/discv5'
import { createSecp256k1PeerId } from '@libp2p/peer-id-factory'
import { multiaddr } from '@multiformats/multiaddr'
import { execSync } from 'child_process'
import { HistoryProtocol, PortalNetwork, ProtocolId, toHexString } from 'portalnetwork'
// eslint-disable-next-line node/file-extension-in-import
import { observable } from '@trpc/server/observable'
import EventEmitter from 'events'
// export only the type definition of the API
// None of the actual implementation is exposed to the client
// export type AppRouter = typeof appRouter
import ws from 'ws'

// eslint-disable-next-line node/file-extension-in-import
import { applyWSSHandler } from '@trpc/server/adapters/ws'
import { subscriptions } from './subscriptions.js'
const bootnodes = [
  'enr:-I24QDy_atpK3KlPjl6X5yIrK7FosdHI1cW0I0MeiaIVuYg3AEEH9tRSTyFb2k6lpUiFsqxt8uTW3jVMUzoSlQf5OXYBY4d0IDAuMS4wgmlkgnY0gmlwhKEjVaWJc2VjcDI1NmsxoQOSGugH1jSdiE_fRK1FIBe9oLxaWH8D_7xXSnaOVBe-SYN1ZHCCIyg',
  'enr:-I24QIdQtNSyUNcoyR4R7pWLfGj0YuX550Qld0HuInYo_b7JE9CIzmi2TF9hPg-OFL3kebYgLjnPkRu17niXB6xKQugBY4d0IDAuMS4wgmlkgnY0gmlwhJO2oc6Jc2VjcDI1NmsxoQJal-rNlNBoOMikJ7PcGk1h6Mlt_XtTWihHwOKmFVE-GoN1ZHCCIyg',
  'enr:-I24QI_QC3IsdxHUX_jk8udbQ4U2bv-Gncsdg9GzgaPU95ayHdAwnH7mY22A6ggd_aZegFiBBOAPamkP2pyHbjNH61sBY4d0IDAuMS4wgmlkgnY0gmlwhJ31OTWJc2VjcDI1NmsxoQMo_DLYhV1nqAVC1ayEIwrhoFCcHvWuhC_J-w-n_4aHP4N1ZHCCIyg',
  'enr:-IS4QGUtAA29qeT3cWVr8lmJfySmkceR2wp6oFQtvO_uMe7KWaK_qd1UQvd93MJKXhMnubSsTQPJ6KkbIu0ywjvNdNEBgmlkgnY0gmlwhMIhKO6Jc2VjcDI1NmsxoQJ508pIqRqsjsvmUQfYGvaUFTxfsELPso_62FKDqlxI24N1ZHCCI40',
  'enr:-IS4QNaaoQuHGReAMJKoDd6DbQKMbQ4Mked3Gi3GRatwgRVVPXynPlO_-gJKRF_ZSuJr3wyHfwMHyJDbd6q1xZQVZ2kBgmlkgnY0gmlwhMIhKO6Jc2VjcDI1NmsxoQM2kBHT5s_Uh4gsNiOclQDvLK4kPpoQucge3mtbuLuUGYN1ZHCCI44',
  'enr:-IS4QBdIjs6S1ZkvlahSkuYNq5QW3DbD-UDcrm1l81f2PPjnNjb_NDa4B5x4olHCXtx0d2ZeZBHQyoHyNnuVZ-P1GVkBgmlkgnY0gmlwhMIhKO-Jc2VjcDI1NmsxoQOO3gFuaCAyQKscaiNLC9HfLbVzFdIerESFlOGcEuKWH4N1ZHCCI40',
  'enr:-IS4QM731tV0CvQXLTDcZNvgFyhhpAjYDKU5XLbM7sZ1WEzIRq4zsakgrv3KO3qyOYZ8jFBK-VzENF8o-vnykuQ99iABgmlkgnY0gmlwhMIhKO-Jc2VjcDI1NmsxoQMTq6Cdx3HmL3Q9sitavcPHPbYKyEibKPKvyVyOlNF8J4N1ZHCCI44',
  'enr:-IS4QFV_wTNknw7qiCGAbHf6LxB-xPQCktyrCEZX-b-7PikMOIKkBg-frHRBkfwhI3XaYo_T-HxBYmOOQGNwThkBBHYDgmlkgnY0gmlwhKRc9_OJc2VjcDI1NmsxoQKHPt5CQ0D66ueTtSUqwGjfhscU_LiwS28QvJ0GgJFd-YN1ZHCCE4k',
  'enr:-IS4QDpUz2hQBNt0DECFm8Zy58Hi59PF_7sw780X3qA0vzJEB2IEd5RtVdPUYZUbeg4f0LMradgwpyIhYUeSxz2Tfa8DgmlkgnY0gmlwhKRc9_OJc2VjcDI1NmsxoQJd4NAVKOXfbdxyjSOUJzmA4rjtg43EDeEJu1f8YRhb_4N1ZHCCE4o',
  'enr:-IS4QGG6moBhLW1oXz84NaKEHaRcim64qzFn1hAG80yQyVGNLoKqzJe887kEjthr7rJCNlt6vdVMKMNoUC9OCeNK-EMDgmlkgnY0gmlwhKRc9-KJc2VjcDI1NmsxoQLJhXByb3LmxHQaqgLDtIGUmpANXaBbFw3ybZWzGqb9-IN1ZHCCE4k',
  'enr:-IS4QA5hpJikeDFf1DD1_Le6_ylgrLGpdwn3SRaneGu9hY2HUI7peHep0f28UUMzbC0PvlWjN8zSfnqMG07WVcCyBhADgmlkgnY0gmlwhKRc9-KJc2VjcDI1NmsxoQJMpHmGj1xSP1O-Mffk_jYIHVcg6tY5_CjmWVg1gJEsPIN1ZHCCE4o',
]
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

  portal.enableLog('*ultralight*, *LightClient*, *Portal*')

  const history = portal.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
  const router = t.router

  const clientA = jayson.Client.http({
    host: '192.168.86.29',
    port: 8545,
  })
  const clients: Record<number, jayson.HttpClient> = {
    8545: clientA,
  }
  const ee = new EventEmitter()
  ;(portal.discv5 as Discv5EventEmitter).on('talkReqReceived', (msg: any) => {
    ee.emit('talkReqReceived', msg)
  })
  ;(portal.discv5 as Discv5EventEmitter).on('talkRespReceived', (msg: any) => {
    ee.emit('talkRespReceived', msg)
  })
  history.on('ContentAdded', (...args: any) => {
    ee.emit('ContentAdded', args)
  })

  //  WSS Client Methods

  const { onTalkReq, onTalkResp, onContentAdded } = await subscriptions(
    portal,
    history,
    publicProcedure,
  )

  /**
   * {@link discv5_nodeInfo}
   */
  const self = publicProcedure
    .meta({
      description: 'Get ENR, NodeId, Client Tag, and MultiAddress',
    })
    .mutation(() => {
      return {
        enr: portal.discv5.enr.encodeTxt(),
        nodeId: portal.discv5.enr.nodeId,
        client: 'ultralight',
        multiAddr: portal.discv5.enr.getLocationMultiaddr('udp')?.toString(),
      }
    })

  /**
   * {@link portal_historyRoutingTableInfo}
   */
  const local_routingTable = publicProcedure
    .meta({
      description: 'Get Local Routing Table',
    })
    .mutation(() => {
      return [...history.routingTable.buckets.entries()]
        .filter(([_, bucket]) => bucket.values().length > 0)
        .map(([idx, bucket]) => {
          return bucket
            .values()
            .map((enr) => [
              enr.kvs.get('c')?.toString() ?? '',
              enr.encodeTxt(),
              enr.nodeId,
              enr.getLocationMultiaddr('udp')!.toString(),
              idx,
            ])
        })
        .flat()
    })

  /**
   * {@link portal_historyPing}
   */
  const ping = publicProcedure
    .meta({
      description: 'Send Ping to ENR',
    })
    .input(
      z.object({
        enr: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const _pong = await history.sendPing(input.enr)
      const pong = _pong
        ? { customPayload: toHexString(_pong.customPayload), enrSeq: Number(_pong.enrSeq) }
        : undefined
      return pong
    })

  const pingBootNodes = publicProcedure
    .meta({
      description: 'Ping all BootNodes',
    })
    .mutation(async () => {
      const pongs = []
      for await (const [idx, enr] of bootnodes.entries()) {
        const _pong = await history.sendPing(enr)
        console.log({
          enr: `${idx < 3 ? 'trin' : idx < 7 ? 'fluffy' : 'ultralight'}: ${enr.slice(0, 12)}`,
          _pong,
        })
        const pong = _pong
          ? {
              tag: `${idx < 3 ? 'trin' : idx < 7 ? 'fluffy' : 'ultralight'}`,
              enr: `${enr.slice(0, 12)}`,
              customPayload: BigInt(toHexString(_pong.customPayload)).toString(2).length,
              enrSeq: Number(_pong.enrSeq),
            }
          : {
              tag: ``,
              enr: ``,
              customPayload: '',
              enrSeq: -1,
            }
        pongs.push(pong)
      }
      return pongs
    })

  /**
   * HTTP Client Methods
   */

  /**
   * {@link portal_historyRoutingTableInfo}
   */
  const portal_historyRoutingTableInfo = publicProcedure
    .meta({
      description: 'Get Local Routing Table Info',
    })
    .mutation(async () => {
      const res = await clients[8545].request('portal_historyRoutingTableInfo', [])
      const routingTable = res.result
      return {
        routingTable: routingTable.buckets,
      }
    })
  const discv5_nodeInfo = publicProcedure
    .meta({
      description: 'Get ENR, NodeId, Client Tag, and MultiAddress',
    })
    .input(
      z.object({
        port: z.number(),
      }),
    )
    .mutation(async ({ input }) => {
      let client
      if (clients[input.port]) {
        client = clients[input.port]
      } else {
        client = jayson.Client.http({
          host: '192.168.86.29',
          port: input.port,
        })
      }
      const info = await client.request('discv5_nodeInfo', [])
      const enr = ENR.decodeTxt(info.result.enr)
      return {
        client: enr.kvs.get('c')?.toString(),
        enr: info.result.enr,
        nodeId: info.result.nodeId,
        multiAddr: (await enr.getFullMultiaddr('udp'))?.toString(),
      }
    })

  const pingBootNodeHTTP = publicProcedure
    .meta({
      description: 'Ping all BootNodes',
    })
    .mutation(async () => {
      const pongs = []
      for await (const [idx, enr] of bootnodes.entries()) {
        const p = await clients[8545].request('portal_historyPing', [enr])
        const _pong = p.result
        console.log({
          enr: `${idx < 3 ? 'trin' : idx < 7 ? 'fluffy' : 'ultralight'}: ${enr.slice(0, 12)}`,
          _pong,
        })
        const pong = _pong
          ? {
              tag: `${idx < 3 ? 'trin' : idx < 7 ? 'fluffy' : 'ultralight'}`,
              enr: `${enr.slice(0, 12)}`,
              customPayload: toHexString(_pong.dataRadius),
              enrSeq: Number(_pong.enrSeq),
            }
          : {
              tag: '',
              enr: ``,
              customPayload: '',
              enrSeq: -1,
            }
        pongs.push(pong)
      }
      return pongs
    })

  /**
   * {@link portal_historyPing}
   */
  const portal_historyPing = publicProcedure
    .meta({
      description: 'Send Ping to ENR',
    })
    .input(
      z.object({
        port: z.number(),
        enr: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const client = clients[input.port]
      if (!client) {
        throw new Error('no client')
      }
      const p = await client.request('portal_historyPing', [input.enr])
      const _pong = p.result
      const pong = _pong
        ? {
            dataRadius: toHexString(_pong.dataRadius),
            enrSeq: Number(_pong.enrSeq),
          }
        : {
            dataRadius: 'undefined',
            enrSeq: -1,
          }
      return pong
    })

  // Create tRpc Router

  const appRouter = router({
    onTalkReq,
    onTalkResp,
    onContentAdded,
    self,
    local_routingTable,
    ping,
    pingBootNodes,
    discv5_nodeInfo,
    portal_historyRoutingTableInfo,
    portal_historyPing,
    pingBootNodeHTTP,
  })

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

  // const manager = new RPCManager(portal)
  // const methods = manager.getMethods()
  // const server = new jayson.Server(methods, {
  //   router: function (method, params) {
  //     // `_methods` is not part of the jayson.Server interface but exists on the object
  //     // but the docs recommend this pattern for custom routing
  //     // https://github.com/tedeh/jayson/blob/HEAD/examples/method_routing/server.js
  //     {
  //       console.log(`Received ${method} with params: ${JSON.stringify(params)}`)
  //       return this.getMethod(method)
  //     }
  //   },
  // })
  // server.http().listen(8546)

  // console.log(`Started JSON RPC Server address=http://${ip}:${8546}`)

  console.log('nodeId', portal.discv5.enr.encodeTxt())
  console.log('nodeId', portal.discv5.enr.nodeId)

  console.log('self', JSON.stringify(appRouter.self._def))
  console.log('self', JSON.stringify(appRouter.ping._def))

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
