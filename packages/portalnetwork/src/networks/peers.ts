import type { ENR } from '@chainsafe/enr'
import type { INodeAddress } from '../client/types.js'
import type { IClientInfo } from '../index.js'

export type PeerScore = {
  errors: number
}

export class ScoredPeer {
  nodeAddress: INodeAddress
  enr?: ENR
  score: PeerScore = {
    errors: 0,
  }
  capabilities: Array<number> = []
  clientInfo?: IClientInfo
  radius?: bigint
  ignored: boolean = false
  banned: boolean = false
  constructor({
    nodeAddress,
    enr,
    score,
    capabilities,
    clientInfo,
    radius,
    ignored,
    banned,
  }: {
    nodeAddress: INodeAddress
    enr?: ENR
    score?: PeerScore
    capabilities?: Array<number>
    clientInfo?: IClientInfo
    radius?: bigint
    ignored?: boolean
    banned?: boolean
  }) {
    this.nodeAddress = nodeAddress
    this.enr = enr
    this.score = score ?? this.score
    this.capabilities = capabilities ?? this.capabilities
    this.clientInfo = clientInfo
    this.radius = radius
    this.ignored = ignored ?? this.ignored
    this.banned = banned ?? this.banned
  }
}

