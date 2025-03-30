import { RequestCode } from '../PortalNetworkUtp/types.js'

import { randUint16 } from './math.js'

export const VERSION = 1
export const MAX_UINT_8 = 0xff
export const MAX_BYTE = MAX_UINT_8
export const UINT16MAX = 0xffff
export const ID_MASK = 0xf << 4
export const MTU = 100

export const DELAY_TARGET = 100
export const TWO_MINUTES = 120000000

export const MAX_CWND_INCREASE_PACKETS_PER_RTT = 3000
export const C_CONTROL_TARGET_MICROS = 100000
export const MINIMUM_TIMEOUT_MILLIS = 500

export const MAX_CONNECTION_ATTEMPTS: number = 5
export const CONNECTION_ATTEMPT_INTERVALL_MILLIS: number = 5000
export const MINIMUM_DELTA_TO_MAX_WINDOW_MICROS: number = 1000000
export const SKIP_PACKETS_UNTIL_ACK: number = 2
export const AUTO_ACK_SMALLER_THAN_ACK_NUMBER: boolean = true
export const MINIMUM_DIFFERENCE_TIMESTAMP_MICROSEC: number = 120000000

export const DEFAULT_PACKET_SIZE = 512
export const MAX_UDP_PACKET_SIZE: number = 1280

export const startingNrs: Record<RequestCode, { seqNr: number; ackNr: number }> = {
  [RequestCode.FOUNDCONTENT_WRITE]: { seqNr: randUint16(), ackNr: 0 },
  [RequestCode.FINDCONTENT_READ]: { seqNr: randUint16(), ackNr: 1 },
  [RequestCode.OFFER_WRITE]: { seqNr: randUint16(), ackNr: 0 },
  [RequestCode.ACCEPT_READ]: { seqNr: randUint16(), ackNr: 0 },
}
