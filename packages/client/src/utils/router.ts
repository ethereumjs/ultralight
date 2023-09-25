import { initTRPC } from '@trpc/server'
import { observable } from '@trpc/server/observable'
import EventEmitter from 'events'
import { z } from 'zod'
const t = initTRPC.create({
  allowOutsideOfServer: true,
})
const publicProcedure = t.procedure
const router = t.router

const demorows: [string, string, string, string, number][] = [['', '', '', '', -1]]

const onTalkReq = publicProcedure.subscription(({ input }) => {
  const ee = new EventEmitter()
  return observable((emit) => {
    const talkReq = (msg: any) => {
      console.log(msg)
      emit.next(msg)
    }
    ee.on('talkReqReceived', (msg: any) => {
      console.log('talkRequestReceived')
      talkReq(msg)
    })
    return () => {
      ee.off('talkReqReceived', () => {
        console.log('off talkRequest')
        talkReq
      })
    }
  })
})

const self = publicProcedure.mutation(() => {
  return {
    enr: '',
    nodeId: '',
    client: '',
    multiAddr: '',
  }
})

const local_routingTable = publicProcedure
  .output(z.array(z.tuple([z.string(), z.string(), z.string(), z.string(), z.number()])))
  .mutation(() => {
    return demorows
  })
const portal_historyRoutingTableInfo = publicProcedure.mutation(async () => {
  return {
    routingTable: [['']],
  }
})
const discv5_nodeInfo = publicProcedure
  .input(
    z.object({
      port: z.number(),
    }),
  )
  .mutation(async ({ input }) => {
    return {
      client: 'ultralight',
      enr: '',
      nodeId: '',
      multiAddr: '',
    }
  })

const ping = publicProcedure
  .input(
    z.object({
      enr: z.string(),
    }),
  )
  .mutation(async ({ input }) => {
    const x = Math.random() >= 0.5
    const pong = x ? undefined : { customPayload: '', enrSeq: '' }
    return pong
  })
const pingBootNodes = publicProcedure.mutation(async () => {
  const x = Math.random() >= 0.5
  return [{ tag: '', enr: '', customPayload: '', enrSeq: -1 }, null]
})

const portal_historyPing = publicProcedure
  .input(
    z.object({
      enr: z.string(),
    }),
  )
  .mutation(async () => {
    const x = Math.random() >= 0.5
    return [{ dataRadius: '', enrSeq: 1 }]
  })
const pingBootNodeHTTP = publicProcedure.mutation(async () => {
  const x = Math.random() >= 0.5
  return [{ tag: '', enr: '', dataRadius: '', enrSeq: -1 }]
})

export const appRouter = router({
  onTalkReq,
  self,
  local_routingTable,
  ping,
  pingBootNodes,
  discv5_nodeInfo,
  portal_historyRoutingTableInfo,
  portal_historyPing,
  pingBootNodeHTTP,
})

export type AppRouter = typeof appRouter
