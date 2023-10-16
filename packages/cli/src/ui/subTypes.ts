import { MessageCodes } from 'portalnetwork'

export type Topic = keyof typeof MessageCodes | 'UTP'

export type TalkRequestResult = {
  nodeId: string
  topic: Topic
  message: string
}
