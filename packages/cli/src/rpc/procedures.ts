import { ENR, toHexString } from 'portalnetwork'
import { PublicProcudure } from '../subscriptions.js'
import { z } from 'zod'
import jayson from 'jayson/promise/index.js'
import {
  z_RoutingTableInfoResult,
  z_historyFindContentParams,
  z_historyFindContentResult,
  z_historyFindNodesParams,
  z_historyFindNodesResult,
  z_historyGossipParams,
  z_historyGossipResult,
  z_historyLocalContentParams,
  z_historyLocalContentResult,
  z_historyOfferParams,
  z_historyOfferResult,
  z_historyPingParams,
  z_historyPingResult,
  z_historyRecursiveFindContentParams,
  z_historyRecursiveFindContentResult,
  z_historySendOfferParams,
  z_historySendOfferResult,
  z_historyStoreParams,
  z_historyStoreResult,
  z_nodeId,
  z_ui,
} from './trpcTypes.js'
import { bootnodes } from '../procedures.js'

export const httpProcedures = (publicProcedure: PublicProcudure, ipAddr: string) => {
  const httpClient = (port: number, ip: string = ipAddr) => {
    return jayson.Client.http({
      host: ip,
      port: port,
    })
  }
  /**
   * HTTP Client Methods
   */
  const getPubIp = publicProcedure.input(z.undefined()).query(() => {
    console.log(ipAddr)
    return ipAddr
  })

  const portal_historyGetEnr = publicProcedure
    .meta({
      description: 'Get ENR',
    })
    .input(
      z.object({ port: z.number(), ip: z.union([z.undefined(), z.string()]), nodeId: z_nodeId }),
    )
    .output(
      z.union([
        z.string(),
        z.object({
          enr: z.string(),
          nodeId: z.string(),
          multiaddr: z.string(),
          c: z.string(),
        }),
      ]),
    )
    .mutation(async ({ input }) => {
      const client = httpClient(input.port, input.ip)
      const res = await client.request('portal_historyGetEnr', [input.nodeId])
      if (res.result && res.result.startsWith('enr')) {
        const enr = ENR.decodeTxt(res.result)
        return {
          enr: res.result,
          nodeId: enr.nodeId,
          multiaddr: enr.getLocationMultiaddr('udp')?.toString() ?? '',
          c: enr.kvs.get('c')?.toString() ?? '',
        }
      }
      return ''
    })

  /**
   * {@link portal_historyRoutingTableInfo}
   */
  const portal_historyRoutingTableInfo = publicProcedure
    .meta({
      description: 'Get Local Routing Table Info',
    })
    .input(z.object({ port: z.number(), ip: z.union([z.undefined(), z.string()]) }))
    .output(z_RoutingTableInfoResult)
    .mutation(async ({ input }) => {
      const client = httpClient(input.port, input.ip)
      const res = await client.request('portal_historyRoutingTableInfo', [])
      const routingTable = res.result ?? { localNodeId: '', buckets: [] }
      return routingTable
    })

  const local_routingTable = publicProcedure
    .meta({
      description: 'Get Local Routing Table Info',
    })
    .input(z.object({ port: z.number(), ip: z.union([z.undefined(), z.string()]) }))
    .output(z.array(z.array(z.union([z.number(), z.string()]))))
    .mutation(async ({ input }) => {
      const client = httpClient(input.port, input.ip)
      const res = await client.request('portal_historyRoutingTableInfo', [])
      const routingTable = res.result ?? { localNodeId: 'err', buckets: [] }
      const buckets: [string, string, string, string, number][] = [
        ...routingTable.buckets.entries(),
      ]
        .filter(([_, bucket]) => bucket.length > 0)
        .map(([idx, bucket]) => {
          return bucket.map((nodeId: string) => [nodeId, 256 - idx])
        })
        .flat()

      console.log('BUCKETS', buckets)
      return buckets
    })

  const discv5_nodeInfo = publicProcedure
    .meta({
      description: 'Get ENR, NodeId, Client Tag, and MultiAddress',
    })
    .input(
      z.object({
        port: z.number(),
        ip: z.union([z.undefined(), z.string()]),
      }),
    )
    .mutation(async ({ input }) => {
      const client = httpClient(input.port, input.ip)
      const info = await client.request('discv5_nodeInfo', [])
      const enr = ENR.decodeTxt(info.result.enr)
      return {
        client: enr.kvs.get('c')?.toString(),
        enr: info.result.enr,
        nodeId: info.result.nodeId,
        multiAddr: (await enr.getFullMultiaddr('udp'))?.toString(),
      }
    })

  const portal_historyPing = publicProcedure
    .meta({
      description: 'Send Ping to ENR',
    })
    .input(z_ui(z_historyPingParams))
    .output(z_historyPingResult)
    .mutation(async ({ input }) => {
      const client = httpClient(input.port, input.ip)
      const p = await client.request('portal_historyPing', [input.enr])
      const _pong = p.result
      const pong = _pong && {
        dataRadius: toHexString(_pong.dataRadius),
        enrSeq: _pong.enrSeq,
      }
      return pong
    })

  const pingBootNodeHTTP = publicProcedure
    .meta({
      description: 'Ping all BootNodes',
    })
    .input(
      z.object({
        port: z.number(),
        ip: z.union([z.undefined(), z.string()]),
      }),
    )
    .output(
      z.record(
        z.string(),
        z.object({
          idx: z.number(),
          client: z.string(),
          nodeId: z.string(),
          enr: z.string(),
          connected: z.boolean(),
        }),
      ),
    )
    .mutation(async ({ input }) => {
      const client = httpClient(input.port, input.ip)
      const pongs = []
      for await (const [idx, enr] of bootnodes.entries()) {
        const p = await client.request('portal_historyPing', [enr.enr])
        const pongRes = p.result
        const pong = {
          idx,
          client: `${idx < 3 ? 'trin' : idx < 7 ? 'fluffy' : 'ultralight'}`,
          enr: enr.enr,
          nodeId: enr.nodeId,
          connected: pongRes ? true : false,
        }

        pongs.push([enr.nodeId, pong])
      }
      return Object.fromEntries(pongs)
    })

  const portal_historyStore = publicProcedure
    .meta({
      description: 'Store Content',
    })
    .input(z_ui(z_historyStoreParams))
    .output(z_historyStoreResult)
    .mutation(async ({ input }) => {
      const res = await httpClient(input.port, input.ip).request('portal_historyStore', [
        input.contentKey,
        input.content,
      ])
      return res.result
    })

  const portal_historyLocalContent = publicProcedure
    .meta({
      description: 'Get Content from local DB',
    })
    .input(z_ui(z_historyLocalContentParams))
    .output(z_historyLocalContentResult)
    .mutation(async ({ input }) => {
      const res = await httpClient(input.port, input.ip).request('portal_historyLocalContent', [
        input.contentKey,
      ])
      return res.result
    })

  const portal_historyFindNodes = publicProcedure
    .meta({
      description: 'Find Nodes',
    })
    .input(z_ui(z_historyFindNodesParams))
    .output(z_historyFindNodesResult)
    .mutation(async ({ input }) => {
      const res = await httpClient(input.port, input.ip).request('portal_historyFindNodes', [
        input.enr,
        input.distances,
      ])
      return res.result
    })

  const portal_historyFindContent = publicProcedure
    .meta({
      description: 'Find Content',
    })
    .input(z_ui(z_historyFindContentParams))
    .output(z_historyFindContentResult)
    .mutation(async ({ input }) => {
      const res = await httpClient(input.port, input.ip).request('portal_historyFindContent', [
        input.enr,
        input.contentKey,
      ])
      return res.result
    })

  const portal_historyRecursiveFindContent = publicProcedure
    .meta({
      description: 'Recursive Find Content',
    })
    .input(z_ui(z_historyRecursiveFindContentParams))
    .output(z_historyRecursiveFindContentResult)
    .mutation(async ({ input }) => {
      const res = await httpClient(input.port, input.ip).request(
        'portal_historyRecursiveFindContent',
        [input.contentKey],
      )
      return res.result
    })

  const portal_historyOffer = publicProcedure
    .meta({
      description: 'Offer Content',
    })
    .input(z_ui(z_historyOfferParams))
    .output(z_historyOfferResult)
    .mutation(async ({ input }) => {
      const res = await httpClient(input.port, input.ip).request('portal_historyOffer', [
        input.enr,
        input.contentKey,
        input.content,
      ])
      return res.result
    })

  const portal_historySendOffer = publicProcedure
    .meta({
      description: 'Send Offer',
    })
    .input(z_ui(z_historySendOfferParams))
    .output(z_historySendOfferResult)
    .mutation(async ({ input }) => {
      const res = await httpClient(input.port, input.ip).request('portal_historySendOffer', [
        input.nodeId,
        input.contentKeys,
      ])
      return res.result
    })

  const portal_historyGossip = publicProcedure
    .meta({
      description: 'Gossip Content',
    })
    .input(z_ui(z_historyGossipParams))
    .output(z_historyGossipResult)
    .mutation(async ({ input }) => {
      const res = await httpClient(input.port, input.ip).request('portal_historyGossip', [
        input.contentKey,
        input.content,
      ])
      return res.result
    })

  return {
    getPubIp,
    portal_historyRoutingTableInfo,
    local_routingTable,
    discv5_nodeInfo,
    pingBootNodeHTTP,
    portal_historyGetEnr,
    portal_historyStore,
    portal_historyLocalContent,
    portal_historyPing,
    portal_historyFindNodes,
    portal_historyFindContent,
    portal_historyRecursiveFindContent,
    portal_historyOffer,
    portal_historySendOffer,
    portal_historyGossip,
  }
}
