import { Discv5EventEmitter } from '@chainsafe/discv5'
import { initTRPC } from '@trpc/server'
// eslint-disable-next-line node/file-extension-in-import
import { observable } from '@trpc/server/observable'
import { EventEmitter } from 'events'
import { HistoryProtocol, PortalNetwork } from 'portalnetwork'

const t = initTRPC
  .context()
  .meta<{
    description: string
  }>()
  .create()
const pubProcedure = t.procedure
type PublicProcudure = typeof pubProcedure

export const subscriptions = async (
  portal: PortalNetwork,
  history: HistoryProtocol,
  publicProcedure: PublicProcudure,
) => {
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
  ;(portal as any).on('NodeAdded', (...args: any) => {
    ee.emit('NodeAdded', args)
  })
  portal.uTP.on('send', (...args) => {
    ee.emit('uTPEvent', args)
  })

  //  WSS Client Methods

  const onTalkReq = publicProcedure
    .meta({
      description: 'Subscribe to Discv5 TalkReq listener',
    })
    .subscription(() => {
      return observable((emit) => {
        const talkReq = (msg: any) => {
          console.log(msg)
          emit.next(msg)
        }
        ee.on('talkReqReceived', talkReq)
        return () => {
          ee.off('talkReqReceived', talkReq)
        }
      })
    })
  const onTalkResp = publicProcedure
    .meta({
      description: 'Subscribe to Discv5 TalkResp listener',
    })
    .subscription(() => {
      return observable((emit) => {
        const talkResp = (msg: any) => {
          console.log(msg)
          emit.next(msg)
        }
        ee.on('talkRespReceived', talkResp)
        return () => {
          ee.off('talkRespReceived', talkResp)
        }
      })
    })
  const onContentAdded = publicProcedure
    .meta({
      description: 'Subscribe to ContentAdded listener',
    })
    .subscription(() => {
      return observable((emit) => {
        const contentAdded = (...args: any) => {
          console.log(args)
          emit.next(args)
        }
        ee.on('ContentAdded', contentAdded)
        return () => {
          ee.off('talkReqReceived', contentAdded)
        }
      })
    })
  const onNodeAdded = publicProcedure
    .meta({
      description: 'Subscribe to NodeAdded listener',
    })
    .subscription(() => {
      return observable((emit) => {
        const contentAdded = (...args: any) => {
          console.log('onNodeAdded', args)
          emit.next(args)
        }
        ee.on('ContentAdded', contentAdded)
        return () => {
          ee.off('talkReqReceived', contentAdded)
        }
      })
    })
  const onUtp = publicProcedure
    .meta({
      description: 'Subscribe to uTP event listener',
    })
    .subscription(() => {
      return observable((emit) => {
        const utpEvent = (...args: any) => {
          console.log('onUtp', args)
          emit.next(args)
        }
        ee.on('utpEvent', utpEvent)
        return () => {
          ee.off('utpEvent', utpEvent)
        }
      })
    })

  return {
    onTalkReq,
    onTalkResp,
    onContentAdded,
    onNodeAdded,
    onUtp,
  }
}
