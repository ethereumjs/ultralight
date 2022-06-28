import debug, { Debugger } from 'debug'
import {
  PortalNetwork,
  ProtocolId,
  HistoryNetworkContentKeyUnionType,
  ENR,
  fromHexString,
  toHexString,
  addRLPSerializedBlock,
  HeaderAccumulatorType,
  shortId,
} from 'portalnetwork'

import { isValidId } from './util'
import { HistoryProtocol } from 'portalnetwork/dist/subprotocols/history/history'
import { HistoryNetworkContentTypes } from 'portalnetwork/dist/subprotocols/history/types'
import { CanonicalIndicesProtocol } from 'portalnetwork/dist/subprotocols/canonicalIndices/canonicalIndices'
import { BaseProtocol } from 'portalnetwork/dist/subprotocols/protocol'
import { NodeLookup } from 'portalnetwork/dist/subprotocols/nodeLookup'

export class RPCManager {
  public _client: PortalNetwork
  private logger: Debugger
  private _methods: { [key: string]: Function } = {
    discv5_nodeInfo: async () => {
      this.logger('discv5_nodeInfo request received')
      return 'Ultralight-CLI: v0.0.1'
    },
    eth_getBlockByHash: async (params: [string, boolean]) => {
      const [blockHash, includeTransactions] = params
      this.logger(
        `eth_getBlockByHash request received. blockHash: ${blockHash} includeTransactions: ${includeTransactions}`
      )
      try {
        const protocol = this._client.protocols.get(
          ProtocolId.HistoryNetwork
        ) as never as HistoryProtocol
        const block = await protocol.getBlockByHash(blockHash, includeTransactions)
        return block ?? 'Block not found'
      } catch {
        return 'Block not found'
      }
    },
    eth_getBlockByNumber: async (params: [string, boolean]) => {
      const [blockNumber, includeTransactions] = params
      this.logger(
        `eth_getBlockByNumber request received.  blockNumber: ${blockNumber} includeTransactions: ${includeTransactions}`
      )
      try {
        const canonicalIndices = this._client.protocols.get(
          ProtocolId.CanonicalIndicesNetwork
        ) as CanonicalIndicesProtocol
        const blockHash = canonicalIndices.blockHash(parseInt(blockNumber))
        const history = this._client.protocols.get(
          ProtocolId.HistoryNetwork
        ) as never as HistoryProtocol
        if (!blockHash) return 'Block not found'
        const block = await history.getBlockByHash(blockHash, includeTransactions)
        this.logger(block)
        return block ?? 'Block not found'
      } catch {
        return 'Block not found'
      }
    },
    portal_addBootNode: async (params: [string, string]) => {
      const [enr, protocolId] = params
      const encodedENR = ENR.decodeTxt(enr)
      this.logger(
        `portal_addBootNode request received for NodeID: ${encodedENR.nodeId.slice(0, 15)}...`
      )
      const protocol = this._client.protocols.get(protocolId as ProtocolId)
      if (protocol) {
        await protocol.addBootNode(enr)
        return `Bootnode added for ${encodedENR.nodeId.slice(0, 15)}...`
      } else {
        return `ProtocolID ${protocolId} not supported`
      }
    },
    portal_addBlockToHistory: async (params: [string, string]) => {
      const [blockHash, rlpHex] = params
      const protocol = this._client.protocols.get(
        ProtocolId.HistoryNetwork
      ) as never as HistoryProtocol
      try {
        addRLPSerializedBlock(rlpHex, blockHash, protocol)
        return `blockheader for ${blockHash} added to content DB`
      } catch (err: any) {
        this.logger(`Error trying to load block to DB. ${err.message.toString()}`)
        return `internal error`
      }
    },
    portal_addBlockHeaderToHistory: async (params: [string, string]) => {
      const [blockHash, rlpHex] = params
      try {
        const protocol = this._client.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
        protocol.addContentToHistory(
          1,
          HistoryNetworkContentTypes.BlockHeader,
          blockHash,
          fromHexString(rlpHex)
        )
        return `blockheader for ${blockHash} added to content DB`
      } catch (err: any) {
        this.logger(`Error trying to load block to DB. ${err.message.toString()}`)
        return `Error trying to load block to DB. ${err.message.toString()}`
      }
    },
    portal_nodeEnr: async () => {
      this.logger(`portal_nodeEnr request received`)
      try {
        const enr = this._client.discv5.enr.encodeTxt()
        return enr
      } catch (err) {
        return 'Unable to generate ENR'
      }
    },
    portal_findNodes: async (params: [string, number[], string]) => {
      const [dstId, distances, protocolId] = params
      if (!isValidId(dstId)) {
        return 'invalid node id'
      }
      const protocol = this._client.protocols.get(protocolId as ProtocolId)
      if (!protocol) {
        return `ProtocolID ${protocolId} not supported`
      }
      this.logger(`portal_findNodes request received with these distances ${distances.toString()}`)
      const res = await protocol.sendFindNodes(dstId, distances)
      this.logger(`response received to findNodes ${res?.toString()}`)
      return `${res?.total ?? 0} nodes returned`
    },
    portal_ping: async (params: [string, string]) => {
      const [enr, protocolId] = params
      const protocol = this._client.protocols.get(protocolId as ProtocolId)
      if (!protocol) {
        return `ProtocolID ${protocolId} not supported`
      }
      const encodedENR = ENR.decodeTxt(enr)
      this.logger(
        `PING request received on ${protocol.protocolName} for ${shortId(encodedENR.nodeId)}`
      )
      await protocol.sendPing(enr)
      this.logger(`PONG received from ${encodedENR.nodeId}`)
      return `PING/PONG successful with ${encodedENR.nodeId}`
    },
    portal_history_findContent: async (params: [string, Uint8Array]) => {
      const [enr, contentKey] = params
      const protocol = this._client.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
      if (!protocol) {
        return `History Protocol not supported`
      }
      const res = await protocol.sendFindContent(enr, contentKey)
      return res
    },
    portal_history_getSnapshot: async (params: [string]) => {
      this.logger('getSnapshot RPC call received')
      const [enr] = params
      const nodeId = ENR.decodeTxt(enr).nodeId
      const protocol = this._client.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
      if (!protocol) {
        return `History Protocol not supported`
      }
      const accumulatorKey = HistoryNetworkContentKeyUnionType.serialize({
        selector: 4,
        value: Uint8Array.from([]),
      })
      await protocol.sendFindContent(nodeId, accumulatorKey)
      return `Received Accumulator Snapshot`
    },
    portal_history_offer: async (params: [string, string[], number[]]) => {
      const [dstId, blockHashes, contentTypes] = params
      contentTypes.forEach((contentType) => {
        try {
          isValidId(dstId)
          contentType > 0
          contentType < 2
        } catch {
          throw new Error('invalid parameters')
        }
      })
      const contentKeys = blockHashes.map((blockHash, idx) => {
        return HistoryNetworkContentKeyUnionType.serialize({
          selector: contentTypes[idx],
          value: {
            chainId: 1,
            blockHash: fromHexString(blockHash),
          },
        })
      })
      const protocol = this._client.protocols.get(
        ProtocolId.HistoryNetwork
      ) as never as HistoryProtocol
      const res = await protocol.sendOffer(dstId, contentKeys)
      return res
    },
    portal_headerAccumulatorRoot: async () => {
      this.logger(`Received request for current header accumulator root hashF`)
      const protocol = this._client.protocols.get(
        ProtocolId.HistoryNetwork
      ) as never as HistoryProtocol
      return toHexString(HeaderAccumulatorType.hashTreeRoot(protocol.accumulator))
    },
    portal_nodeLookup: async (params: [BaseProtocol, string]) => {
      const [protocol, nodeSought] = params
      const enr = ENR.decodeTxt(nodeSought)
      const id = enr.nodeId
      const lookup = new NodeLookup(protocol, id)
      const look = await lookup.startLookup()
      console.log(look)
      return `Node Lookup Successful for ${shortId(nodeSought)}`
    },
  }

  constructor(client: PortalNetwork) {
    this._client = client
    this.logger = debug(this._client.discv5.enr.nodeId.slice(0, 5)).extend('ultralight:RPC')
  }

  public getMethods() {
    return this._methods
  }
}
