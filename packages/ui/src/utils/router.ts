import EventEmitter from 'events'
import { initTRPC } from '@trpc/server'
import { observable } from '@trpc/server/observable'
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

const onTalkResp = publicProcedure.subscription(({ input }) => {
  const ee = new EventEmitter()
  return observable((emit) => {
    const talkResp = (msg: any) => {
      console.log('router', 'onTalkResp')
      emit.next(msg)
    }
    ee.on('talkRespReceived', (msg: any) => {
      console.log('talkResponseReceived')
      talkResp(msg)
    })
    return () => {
      ee.off('talkRespReceived', () => {
        console.log('off talkResponse')
        talkResp
      })
    }
  })
})
const onSendTalkReq = publicProcedure.subscription(({ input }) => {
  const ee = new EventEmitter()
  return observable((emit) => {
    const sendTalkReq = (msg: any) => {
      console.log('router', 'onSendTalkReq')
      emit.next(msg)
    }
    ee.on('sendTalkReq', (msg: any) => {
      sendTalkReq(msg)
    })
    return () => {
      ee.off('sendTalkReq', (msg: any) => {
        sendTalkReq
      })
    }
  })
})
const onSendTalkResp = publicProcedure.subscription(({ input }) => {
  const ee = new EventEmitter()
  return observable((emit) => {
    const sendTalkResp = (msg: any) => {
      emit.next(msg)
    }
    ee.on('sendTalkResp', (msg: any) => {
      sendTalkResp(msg)
    })
    return () => {
      ee.off('sendTalkReq', (msg: any) => {
        sendTalkResp
      })
    }
  })
})

const onContentAdded = publicProcedure.subscription(({ input }) => {
  const ee = new EventEmitter()
  return observable((emit) => {
    const contentAdded = (msg: any) => {
      console.log(msg)
      emit.next(msg)
    }
    ee.on('ContentAdded', (msg: any) => {
      console.log('contentAdded')
      contentAdded(msg)
    })
    return () => {
      ee.off('ContentAdded', () => {
        console.log('off ContentAdded')
        contentAdded
      })
    }
  })
})
const onNodeAdded = publicProcedure.subscription(() => {
  const ee = new EventEmitter()
  return observable((emit) => {
    const nodeAdded = (nodeId: string, networkId: number) => {
      console.log('nodeAdded', { nodeId, networkId })
      emit.next({
        nodeId,
        networkId,
      })
    }
    ee.on('NodeAdded', (nodeId: string, networkId: number) => {
      nodeAdded(nodeId, networkId)
    })
    return () => {
      ee.off('NodeAdded', () => {
        nodeAdded
      })
    }
  })
})
const onUtp = publicProcedure.subscription(({ input }) => {
  const ee = new EventEmitter()
  return observable((emit) => {
    const utp = (msg: any) => {
      console.log(msg)
      emit.next(msg)
    }
    ee.on('utpEvent', (msg: any) => {
      console.log('utpEvent', msg)
      utp(msg)
    })
    return () => {
      ee.off('utpEvent', () => {
        console.log('off utpEvent')
        utp
      })
    }
  })
})

const start = publicProcedure
  .meta({
    description: 'Start Portal Network',
  })
  .mutation(async () => {
    return ''
  })

const browser_nodeInfo = publicProcedure.input(z.any()).mutation(() => {
  return {
    enr: '',
    nodeId: '',
    client: '',
    multiAddr: '',
  }
})

const discv5_nodeInfo = publicProcedure.input(z.any()).mutation(async ({ input }) => {
  return {
    client: 'ultralight',
    enr: '',
    nodeId: '',
    multiAddr: '',
  }
})

const browser_localRoutingTable = publicProcedure
  .input(z.union([z.undefined(), z.object({ port: z.number(), ip: z.string() })]))
  .output(z.array(z.tuple([z.string(), z.string(), z.string(), z.string(), z.number()])))
  .mutation(() => {
    return demorows
  })
const local_routingTable = publicProcedure
  .input(z.union([z.undefined(), z.object({ port: z.number(), ip: z.string() })]))
  .output(z.array(z.tuple([z.string(), z.number()])))
  .mutation(() => {
    return []
  })

const browser_historyFindNodes = publicProcedure
  .input(
    z.object({
      nodeId: z.string(),
    }),
  )
  .mutation(async () => {
    return demorows
  })

const browser_historyFindContent = publicProcedure
  .input(
    z.object({
      nodeId: z.string(),
      contentKey: z.string(),
    }),
  )
  .output(
    z.union([
      z.undefined(),
      z.object({
        content: z.array(z.string()),
      }),
      z.object({
        enrs: z.array(z.string()),
      }),
    ]),
  )
  .mutation(async () => {
    return undefined
  })
const browser_historyRecursiveFindContent = publicProcedure
  .input(
    z.object({
      contentKey: z.string(),
    }),
  )
  .mutation(async () => {
    return JSON.stringify({ key: 'value' })
  })
const browser_historyOffer = publicProcedure
  .input(
    z.object({
      nodeId: z.string(),
      contentKey: z.string(),
      content: z.string(),
    }),
  )
  .mutation(async () => {
    return true
  })

const browser_historySendOffer = publicProcedure
  .input(
    z.object({
      nodeId: z.string(),
      contentKeys: z.array(z.string()),
    }),
  )
  .mutation(async () => {
    return {
      result: '',
      response: [],
    }
  })

const browser_historyGossip = publicProcedure
  .input(
    z.object({
      contentKey: z.string(),
      content: z.string(),
    }),
  )
  .mutation(async () => {
    return 0
  })

const portal_historyRoutingTableInfo = publicProcedure
  .input(
    z.object({
      port: z.number(),
      ip: z.string(),
    }),
  )
  .mutation(async () => {
    return {
      localNodeId: '',
      buckets: [''],
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
const pingBootNodes = publicProcedure
  .input(z.any())
  .output(
    z.record(
      z.string(),
      z.object({
        idx: z.number(),
        client: z.string(),
        enr: z.string(),
        nodeId: z.string(),
        connected: z.boolean(),
      }),
    ),
  )
  .mutation(async () => {
    return {}
  })

const portal_historyPing = publicProcedure
  .input(
    z.object({
      port: z.union([z.undefined(), z.number()]),
      enr: z.string(),
    }),
  )
  .output(z.any())
  .mutation(async () => {
    return { dataRadius: '', enrSeq: 1 }
  })

const browser_historyStore = publicProcedure
  .input(
    z.object({
      contentKey: z.string(),
      content: z.string(),
    }),
  )
  .mutation(async () => {
    return true
  })
const portal_historyStore = publicProcedure
  .input(
    z.object({
      port: z.number(),
      ip: z.union([z.undefined(), z.string()]),
      contentKey: z.string(),
      content: z.string(),
    }),
  )
  .mutation(async () => {
    return true
  })
const browser_historyLocalContent = publicProcedure.input(z.any()).mutation(async () => {
  return ''
})
const portal_historyLocalContent = publicProcedure
  .input(
    z.object({
      contentKey: z.string(),
      port: z.number(),
      ip: z.union([z.undefined(), z.string()]),
    }),
  )
  .mutation(async () => {
    return ''
  })

const pingBootNodeHTTP = publicProcedure
  .input(
    z.object({
      port: z.union([z.undefined(), z.number()]),
      ip: z.union([z.undefined(), z.string()]),
    }),
  )
  .output(
    z.record(
      z.string(),
      z.object({
        idx: z.number(),
        client: z.string(),
        enr: z.string(),
        nodeId: z.string(),
        connected: z.boolean(),
      }),
    ),
  )
  .mutation(async () => {
    return {}
  })

const decodeENR = publicProcedure
  .input(z.string())
  .output(
    z.object({
      nodeId: z.string(),
      c: z.string(),
      multiaddr: z.string(),
    }),
  )
  .mutation(async () => {
    return {
      nodeId: '',
      c: '',
      multiaddr: '',
    }
  })

const browser_ethGetBlockByHash = publicProcedure
  .input(
    z.object({
      hash: z.string(),
      includeTransactions: z.boolean(),
    }),
  )
  .output(z.union([z.undefined(), z.string(), z.record(z.string(), z.string())]))
  .mutation(({ input }) => {
    return undefined
  })

const eth_getBlockByNumber = publicProcedure
  .input(
    z.object({
      blockNumber: z.string(),
      includeTransactions: z.boolean(),
    }),
  )
  .output(z.union([z.undefined(), z.string(), z.record(z.string(), z.string())]))
  .mutation(({ input }) => {
    return undefined
  })
const eth_getBlockByHash = publicProcedure
  .input(
    z.object({
      hash: z.string(),
      includeTransactions: z.boolean(),
    }),
  )
  .output(z.union([z.undefined(), z.string(), z.record(z.string(), z.string())]))
  .mutation(({ input }) => {
    return undefined
  })

const browser_ethGetBlockByNumber = publicProcedure
  .input(
    z.object({
      blockNumber: z.string(),
      includeTransactions: z.boolean(),
    }),
  )
  .output(z.union([z.undefined(), z.string(), z.record(z.string(), z.string())]))
  .mutation(({ input }) => {
    return undefined
  })
const getPubIp = publicProcedure.query(() => {
  return ''
})
const portal_historyFindNodes = publicProcedure
  .input(
    z.object({
      port: z.number(),
      ip: z.string(),
      nodeId: z.string(),
    }),
  )
  .output(z.object({ enrs: z.array(z.string()) }))
  .mutation(async () => {
    return {
      enrs: [],
    }
  })

const portal_historyFindContent = publicProcedure
  .input(
    z.object({
      port: z.number(),
      ip: z.string(),
      enr: z.string(),
      contentKey: z.string(),
    }),
  )
  .output(z.object({ content: z.string() }))
  .mutation(async () => {
    return {
      content: '',
      utpTransfer: true,
    }
  })

const portal_historyRecursiveFindContent = publicProcedure
  .input(
    z.object({
      port: z.number(),
      ip: z.string(),
      contentKey: z.string(),
    }),
  )
  .output(z.object({ content: z.string(), utpTransfer: z.boolean() }))
  .mutation(async () => {
    return {
      content: '',
      utpTransfer: true,
    }
  })

const portal_historyOffer = publicProcedure
  .input(
    z.object({
      port: z.number(),
      ip: z.string(),
      enr: z.string(),
      contentKey: z.string(),
      content: z.string(),
    }),
  )
  .output(z.union([z.undefined(), z.array(z.boolean()), z.array(z.never())]))
  .mutation(async () => {
    return [true]
  })

const portal_historySendOffer = publicProcedure
  .input(
    z.object({
      port: z.number(),
      ip: z.string(),
      nodeId: z.string(),
      contentKeys: z.array(z.string()),
    }),
  )
  .output(z.union([z.string(), z.undefined()]))
  .mutation(async () => {
    return ''
  })

const portal_historyGossip = publicProcedure
  .input(
    z.object({
      port: z.number(),
      ip: z.string(),
      contentKey: z.string(),
      content: z.string(),
    }),
  )
  .output(z.number())
  .mutation(async () => {
    return 0
  })

const portal_historyGetEnr = publicProcedure
  .input(
    z.object({
      port: z.number(),
      ip: z.string(),
      nodeId: z.string(),
    }),
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
  .mutation(async () => {
    return ''
  })

export const appRouter = router({
  getPubIp,
  decodeENR,
  onTalkReq,
  onTalkResp,
  onSendTalkReq,
  onSendTalkResp,
  onContentAdded,
  onNodeAdded,
  onUtp,
  start,
  browser_nodeInfo,
  local_routingTable,
  ping,
  pingBootNodes,
  discv5_nodeInfo,
  portal_historyRoutingTableInfo,
  portal_historyPing,
  browser_localRoutingTable,
  browser_historyLocalContent,
  browser_historyStore,
  pingBootNodeHTTP,
  browser_historyFindNodes,
  browser_historyFindContent,
  browser_historyRecursiveFindContent,
  browser_historyOffer,
  browser_historySendOffer,
  browser_historyGossip,
  browser_ethGetBlockByHash,
  browser_ethGetBlockByNumber,
  eth_getBlockByHash,
  eth_getBlockByNumber,
  portal_historyFindNodes,
  portal_historyFindContent,
  portal_historyRecursiveFindContent,
  portal_historyOffer,
  portal_historySendOffer,
  portal_historyGossip,
  portal_historyStore,
  portal_historyLocalContent,
  portal_historyGetEnr,
})

export type AppRouter = typeof appRouter
