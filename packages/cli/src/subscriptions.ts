import { Discv5EventEmitter } from '@chainsafe/discv5'
import { initTRPC } from '@trpc/server'
// eslint-disable-next-line node/file-extension-in-import
import { observable } from '@trpc/server/observable'
import { EventEmitter } from 'events'
import {
  HistoryProtocol,
  MessageCodes,
  PortalNetwork,
  PortalWireMessageType,
  ProtocolId,
  fromHexString,
  toHexString,
} from 'portalnetwork'

const t = initTRPC
  .context()
  .meta<{
    description: string
  }>()
  .create()
const pubProcedure = t.procedure
export type PublicProcudure = typeof pubProcedure

export const subscriptions = async (
  portal: PortalNetwork,
  history: HistoryProtocol,
  publicProcedure: PublicProcudure,
) => {
  const ee = new EventEmitter()
  ;(portal.discv5 as Discv5EventEmitter).on(
    'talkReqReceived',
    (src: any, sourceId: any, message: any) => {
      ee.emit('talkReqReceived', { src, sourceId, message })
    },
  )
  ;(portal.discv5 as Discv5EventEmitter).on(
    'talkRespReceived',
    (src: any, srcId: any, msg: any) => {
      const source = {
        addr: src.socketAddr.toString(),
        nodeId: '0x' + src.nodeId,
        // enr: srcId.encodeTxt(),
      }
      const message = {
        id: msg.id.toString(),
        response: toHexString(msg.response),
      }
      ee.emit('talkRespReceived', {
        source,
        message,
      })
    },
  )
  history.on('ContentAdded', (...args: any) => {
    ee.emit('ContentAdded', ...args)
  })
  ;(portal as any).on('NodeAdded', (...args: any) => {
    ee.emit('NodeAdded', args)
  })
  portal.uTP.on('send', (...args) => {
    ee.emit('uTPEvent', args)
  })
  ;(portal as any).on('SendTalkReq', (...args: any) => {
    ee.emit('SendTalkReq', ...args)
  })
  ;(portal as any).on('SendTalkResp', (...args: any) => {
    ee.emit('SendTalkResp', ...args)
  })

  //  WSS Client Methods

  const onTalkReq = publicProcedure
    .meta({
      description: 'Subscribe to Discv5 TalkReq listener',
    })
    .subscription(() => {
      return observable((emit) => {
        const talkReq = (args: { src: any; sourceId: any; message: any }) => {
          if (toHexString(args.message.protocol) === ProtocolId.UTPNetwork) {
            emit.next({
              nodeId: '0x' + args.src.nodeId,
              topic: 'UTP',
              message: toHexString(args.message.request),
            })
          } else {
            const deserialized = PortalWireMessageType.deserialize(args.message.request)
            const messageType = deserialized.selector
            emit.next({
              nodeId: '0x' + args.src.nodeId,
              topic: MessageCodes[messageType],
              message: deserialized.value.toString(),
            })
          }
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
        const talkResp = (args: { source: any; message: any }) => {
          try {
            const deserialized = PortalWireMessageType.deserialize(
              fromHexString(args.message.response),
            )
            const messageType = deserialized.selector
            emit.next({
              nodeId: args.source.nodeId,
              topic: MessageCodes[messageType],
              message: deserialized.value.toString(),
            })
          } catch {
            console.log('TalkResp ERROR', args)
          }
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
        const contentAdded = (key: string, contentType: number, content: string) => {
          console.log('onContentAdded', { key, contentType, content })
          emit.next({ key, contentType, content })
        }
        ee.on('ContentAdded', contentAdded)
        return () => {
          ee.off('ContentAdded', contentAdded)
        }
      })
    })
  const onNodeAdded = publicProcedure
    .meta({
      description: 'Subscribe to NodeAdded listener',
    })
    .subscription(() => {
      return observable((emit) => {
        const nodeAdded = (...args: any) => {
          // console.log('onNodeAdded', args)
          emit.next(args)
        }
        ee.on('NodeAdded', nodeAdded)
        return () => {
          ee.off('NodeAdded', nodeAdded)
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
  const onSendTalkReq = publicProcedure
    .meta({
      description: 'Subscribe to send talk req listener',
    })
    .subscription(() => {
      return observable((emit) => {
        const sendReq = (...args: any) => {
          const [nodeId, res, payload] = args
          const deserialized = PortalWireMessageType.deserialize(fromHexString(payload))
          const messageType = deserialized.selector
          console.log('SendTalkReq', {
            topic: MessageCodes[messageType],
            nodeId,
            res,
            payload,
          })
          emit.next({
            nodeId: '0x' + nodeId,
            topic: MessageCodes[messageType],
            message: deserialized.value.toString(),
          })
        }
        ee.on('SendTalkReq', sendReq)
        return () => {
          ee.off('SendTalkReq', sendReq)
        }
      })
    })
  const onSendTalkResp = publicProcedure
    .meta({
      description: 'Subscribe to send talk resp listener',
    })
    .subscription(() => {
      return observable((emit) => {
        const sendResp = (...args: any) => {
          try {
            const [nodeId, requestId, payload] = args
            const deserialized = PortalWireMessageType.deserialize(fromHexString(payload))
            const messageType = deserialized.selector
            console.log('SendTalkResp', {
              topic: MessageCodes[messageType],
              nodeId,
              requestId,
              payload,
            })
            emit.next({
              nodeId: '0x' + nodeId,
              topic: MessageCodes[messageType],
              message: deserialized.value.toString(),
            })
          } catch {
            console.log('SendTalkResp ERROR', args)
          }
        }
        ee.on('SendTalkResp', sendResp)
        return () => {
          ee.off('SendTalkResp', sendResp)
        }
      })
    })

  return {
    onTalkReq,
    onTalkResp,
    onSendTalkReq,
    onSendTalkResp,
    onContentAdded,
    onNodeAdded,
    onUtp,
  }
}
