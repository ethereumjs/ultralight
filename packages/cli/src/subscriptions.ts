import { Discv5EventEmitter } from '@chainsafe/discv5'
import { initTRPC } from '@trpc/server'
// eslint-disable-next-line node/file-extension-in-import
import { observable } from '@trpc/server/observable'
import debug from 'debug'
import { EventEmitter } from 'events'
import {
  HistoryProtocol,
  MessageCodes,
  PortalNetwork,
  PortalNetworkEventEmitter,
  PortalWireMessageType,
  ProtocolId,
  fromHexString,
  toHexString,
} from 'portalnetwork'

const _portalEvents = [
  'onTalkReq',
  'onTalkResp',
  'onSendTalkReq',
  'onSendTalkResp',
  'NodeAdded',
  'ContentAdded',
  'utp.send',
  'utp.socket.send',
  'utp.socket.done',
  'utp.<content stream>',
  'utp.cc.write',
  'utp.writer.send',
  'utp.writer.sent',
  'transport.packet',
  'transport.decodeError',
  'transport.multiaddr',
]

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
  const log = debug('ui:subscription')
  const discv5 = portal.discv5 as Discv5EventEmitter
  const client = portal as PortalNetworkEventEmitter

  //  WSS Client Methods

  const onTalkReq = publicProcedure
    .meta({
      description: 'Subscribe to Discv5 TalkReq listener',
    })
    .subscription(() => {
      return observable((emit) => {
        const talkReq = (src: any, sourceId: any, message: any) => {
          if (toHexString(message.protocol) === ProtocolId.UTPNetwork) {
            emit.next({
              nodeId: '0x' + src.nodeId,
              topic: 'UTP',
              message: toHexString(message.request),
            })
          } else {
            const deserialized = PortalWireMessageType.deserialize(message.request)
            const messageType = deserialized.selector
            emit.next({
              nodeId: '0x' + src.nodeId,
              topic: MessageCodes[messageType],
              message: deserialized.value.toString(),
            })
          }
        }
        discv5.on('talkReqReceived', talkReq)
        return () => {
          discv5.off('talkReqReceived', talkReq)
        }
      })
    })
  const onTalkResp = publicProcedure
    .meta({
      description: 'Subscribe to Discv5 TalkResp listener',
    })
    .subscription(() => {
      return observable((emit) => {
        const talkResp = (src: any, msg: any) => {
          const source = {
            addr: src.socketAddr.toString(),
            nodeId: '0x' + src.nodeId,
          }
          const message = {
            id: msg.id.toString(),
            response: toHexString(msg.response),
          }
          try {
            const deserialized = PortalWireMessageType.deserialize(fromHexString(message.response))
            const messageType = deserialized.selector
            emit.next({
              nodeId: source.nodeId,
              topic: MessageCodes[messageType],
              message: deserialized.value.toString(),
            })
          } catch (err: any) {
            log.extend('TalkResp ERROR')(`${{ src, msg, error: err.message }}`)
          }
        }
        discv5.on('talkRespReceived', talkResp)
        return () => {
          discv5.off('talkRespReceived', talkResp)
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
        history.on('ContentAdded', contentAdded)
        return () => {
          history.off('ContentAdded', contentAdded)
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
          emit.next(args)
        }
        client.on('NodeAdded', nodeAdded)
        return () => {
          client.off('NodeAdded', nodeAdded)
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
        portal.uTP.on('send', utpEvent)
        return () => {
          portal.uTP.off('send', utpEvent)
        }
      })
    })
  const onSendTalkReq = publicProcedure
    .meta({
      description: 'Subscribe to send talk req listener',
    })
    .subscription(() => {
      return observable((emit) => {
        const sendReq = (nodeId: string, _res: string, payload: string) => {
          const deserialized = PortalWireMessageType.deserialize(fromHexString(payload))
          const messageType = deserialized.selector
          emit.next({
            nodeId: '0x' + nodeId,
            topic: MessageCodes[messageType],
            message: deserialized.value.toString(),
          })
        }
        client.on('SendTalkReq', sendReq)
        return () => {
          client.off('SendTalkReq', sendReq)
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
            emit.next({
              nodeId: '0x' + nodeId,
              requestId,
              topic: MessageCodes[messageType],
              message: deserialized.value.toString(),
            })
          } catch (err: any) {
            log.extend('SendTalkResp ERROR')({ args, error: err.message })
          }
        }
        client.on('SendTalkResp', sendResp)
        return () => {
          client.off('SendTalkResp', sendResp)
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
