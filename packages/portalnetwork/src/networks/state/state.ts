import { ENR } from '@chainsafe/discv5'
import { fromHexString, toHexString } from '@chainsafe/ssz'
import { Trie } from '@ethereumjs/trie'
import { Account, Address, bytesToInt, hexToBytes } from '@ethereumjs/util'
import debug from 'debug'

import { shortId } from '../../util/util.js'
import { RequestCode } from '../../wire/index.js'
import {
  ContentMessageType,
  FoundContent,
  MessageCodes,
  PortalWireMessageType,
} from '../../wire/types.js'
import { ContentLookup } from '../contentLookup.js'
import { decodeHistoryNetworkContentKey } from '../history/util.js'
import { BaseNetwork } from '../network.js'
import { NetworkId } from '../types.js'

import { StateDB } from './statedb.js'
import {
  AccountTrieProofType,
  ContractByteCodeType,
  ContractStorageTrieProofType,
  StateNetworkContentType,
} from './types.js'
import { getStateNetworkContentKey } from './util.js'

import type { PortalNetwork } from '../../client/client.js'
import type { FindContentMessage } from '../../wire/types.js'
import type { Debugger } from 'debug'

export class StateNetwork extends BaseNetwork {
  stateDB: StateDB
  networkId: NetworkId.StateNetwork
  networkName = 'StateNetwork'
  logger: Debugger
  constructor(client: PortalNetwork, nodeRadius?: bigint) {
    super(client, nodeRadius)
    this.networkId = NetworkId.StateNetwork
    this.logger = debug(this.enr.nodeId.slice(0, 5)).extend('Portal').extend('StateNetwork')
    this.stateDB = new StateDB(this)
    this.routingTable.setLogger(this.logger)
    client.uTP.on(
      NetworkId.StateNetwork,
      async (contentType: any, contentKey: Uint8Array, content: Uint8Array) => {
        await this.store(contentType, toHexString(contentKey.slice(1)), content)
      },
    )
  }

  /**
   * Send FINDCONTENT request for content corresponding to `key` to peer corresponding to `dstId`
   * @param dstId node id of peer
   * @param key content key defined by the subnetwork spec
   * @returns the value of the FOUNDCONTENT response or undefined
   */
  public sendFindContent = async (dstId: string, key: Uint8Array) => {
    const enr = dstId.startsWith('enr:')
      ? ENR.decodeTxt(dstId)
      : this.routingTable.getWithPending(dstId)?.value
      ? this.routingTable.getWithPending(dstId)?.value
      : this.routingTable.getWithPending(dstId.slice(2))?.value
    if (!enr) {
      this.logger(`No ENR found for ${shortId(dstId)}.  FINDCONTENT aborted.`)
      return
    }
    this.metrics?.findContentMessagesSent.inc()
    const findContentMsg: FindContentMessage = { contentKey: key }
    const payload = PortalWireMessageType.serialize({
      selector: MessageCodes.FINDCONTENT,
      value: findContentMsg,
    })
    this.logger.extend('FINDCONTENT')(`Sending to ${shortId(enr)}`)
    const res = await this.sendMessage(enr, payload, this.networkId)
    if (res.length === 0) {
      return undefined
    }

    try {
      if (bytesToInt(res.slice(0, 1)) === MessageCodes.CONTENT) {
        this.metrics?.contentMessagesReceived.inc()
        this.logger.extend('FOUNDCONTENT')(`Received from ${shortId(enr)}`)
        const decoded = ContentMessageType.deserialize(res.subarray(1))
        const contentKey = decodeHistoryNetworkContentKey(toHexString(key))
        const contentHash = contentKey.blockHash
        const contentType = contentKey.contentType

        switch (decoded.selector) {
          case FoundContent.UTP: {
            const id = new DataView((decoded.value as Uint8Array).buffer).getUint16(0, false)
            this.logger.extend('FOUNDCONTENT')(`received uTP Connection ID ${id}`)
            await this.handleNewRequest({
              networkId: this.networkId,
              contentKeys: [key],
              peerId: dstId,
              connectionId: id,
              requestCode: RequestCode.FINDCONTENT_READ,
              contents: [],
            })
            break
          }
          case FoundContent.CONTENT:
            this.logger(
              `received ${StateNetworkContentType[contentType]} content corresponding to ${contentHash}`,
            )
            try {
              await this.store(key[0], toHexString(key.slice(1)), decoded.value as Uint8Array)
            } catch {
              this.logger('Error adding content to DB')
            }
            break
          case FoundContent.ENRS: {
            this.logger(`received ${decoded.value.length} ENRs`)
            break
          }
        }
        return decoded
      }
    } catch (err: any) {
      this.logger(`Error sending FINDCONTENT to ${shortId(enr)} - ${err.message}`)
    }
  }

  public findContentLocally = async (contentKey: Uint8Array): Promise<Uint8Array> => {
    const value = await this.stateDB.getContent(contentKey)
    return value ?? hexToBytes('0x')
  }

  public routingTableInfo = async () => {
    return {
      nodeId: this.enr.nodeId,
      buckets: this.routingTable.buckets.map((bucket) => bucket.values().map((enr) => enr.nodeId)),
    }
  }

  public store = async (
    contentType: StateNetworkContentType,
    contentKey: string,
    content: Uint8Array,
  ) => {
    this.stateDB.storeContent(contentType, fromHexString(contentKey), content)
    this.logger(`content added for: ${contentKey}`)
    this.emit('ContentAdded', contentKey, contentType, toHexString(content))
  }

  public getAccountTrieProof = async (address: Uint8Array, stateRoot: Uint8Array) => {
    const trie = this.stateDB.getAccountTrie(toHexString(stateRoot))
    const proof = await trie.createProof(address)
    return AccountTrieProofType.serialize({
      witnesses: proof,
    })
  }

  /**
   * Retrieve an account from the state network
   * @param address the hex prefixed string representation of an address
   * @param stateRoot the stateRoot from the block at which you wish to retrieve an account's state
   * @returns an account corresponding to `address` or undefined if not found
   */
  public getAccount = async (address: string, stateRoot: string) => {
    let account
    this.logger.extend('GETACCOUNT')(
      `trying to retrieve account for ${address} at stateRoot ${stateRoot} locally`,
    )
    account = await this.stateDB.getAccount(address, stateRoot)
    if (account !== undefined) return account
    const contentKey = getStateNetworkContentKey({
      address: Address.fromString(address),
      stateRoot: fromHexString(stateRoot),
      contentType: StateNetworkContentType.AccountTrieProof,
    })
    this.logger.extend('GETACCOUNT')(
      `didn't find locally. Trying to retrieve account for ${address} at stateRoot ${stateRoot} from network`,
    )
    const lookup = new ContentLookup(this, contentKey)
    const res = (await lookup.startLookup()) as { content: Uint8Array; utp: boolean }
    if (res?.content !== undefined) {
      const decoded = AccountTrieProofType.deserialize(res.content)
      const trie = new Trie({ useKeyHashing: true })
      await trie.fromProof(decoded.witnesses)
      const accountRLP = await trie.get(fromHexString(address))
      account = accountRLP ? Account.fromRlpSerializedAccount(accountRLP) : undefined
    }
    return account
  }

  /**
   * Retrieve bytecode for a specific address
   * @param codeHash codehash corresponding to the bytecode sought
   * @param address for the bytecode being sought
   * @returns returns the bytecode as a `Uint8Array` or else undefined
   */
  public getBytecode = async (codeHash: string, address: string) => {
    let bytecode
    bytecode = await this.stateDB.getContractByteCode(codeHash)
    if (bytecode !== undefined) return bytecode
    const contentKey = getStateNetworkContentKey({
      codeHash: fromHexString(codeHash),
      address: Address.fromString(address),
      contentType: StateNetworkContentType.ContractByteCode,
    })
    const lookup = new ContentLookup(this, contentKey)
    const res = (await lookup.startLookup()) as { content: Uint8Array; utp: boolean }
    if (res.content !== undefined) {
      bytecode = ContractByteCodeType.deserialize(res.content)
    }
    return bytecode
  }

  /**
   * Retrieve a storage slot for a given account with a given stateroot
   * @param address address for storage slot sought
   * @param slot storage slot sought
   * @param stateRoot stateRoot corresponding to block at which storage slot is sought
   * @returns a storage value corresponding to `slot` or undefined
   */
  public getContractStorage = async (
    address: string,
    slot: bigint,
    stateRoot: string,
  ): Promise<Uint8Array | undefined> => {
    let storage
    try {
      storage = await this.stateDB.getStorageAt(address, slot, stateRoot)
      if (storage !== undefined) return storage
    } catch {
      this.logger(`Content not found locally.  Requesting from network.`)
    }
    const contentKey = getStateNetworkContentKey({
      contentType: StateNetworkContentType.ContractStorageTrieProof,
      address: Address.fromString(address),
      slot,
      stateRoot: fromHexString(stateRoot),
    })
    const lookup = new ContentLookup(this, contentKey)
    let res = await lookup.startLookup()
    if (res !== undefined) {
      res = res as { content: Uint8Array; utp: boolean }
      const proof = ContractStorageTrieProofType.deserialize(res.content)
      if (proof !== undefined) {
        const trie = new Trie({ useKeyHashing: true })
        await trie.fromProof(proof.witnesses)
        storage =
          (await trie.get(fromHexString('0x' + slot.toString(16).padStart(64, '0')))) ?? undefined
      }
    }
    return storage
  }
}
