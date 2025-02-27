import type { ENR, NodeId } from '@chainsafe/enr'
import { ProofType } from '@chainsafe/persistent-merkle-tree'
import {
  bytesToHex,
  bytesToInt,
  concatBytes,
  equalsBytes,
  hexToBytes,
  intToHex,
  padToEven,
  short,
} from '@ethereumjs/util'
import { createBeaconConfig, defaultChainConfig } from '@lodestar/config'
import { genesisData } from '@lodestar/config/networks'
import { Lightclient } from '@lodestar/light-client'
import { computeSyncPeriodAtSlot, getCurrentSlot } from '@lodestar/light-client/utils'
import { ForkName } from '@lodestar/params'
import { ssz } from '@lodestar/types'
import debug from 'debug'

import { getENR, shortId } from '../../util/util.js'
import {
  FoundContent,
  MAX_PACKET_SIZE,
  RequestCode,
  encodeWithVariantPrefix,
  randUint16,
} from '../../wire/index.js'
import { ContentMessageType, MessageCodes, PortalWireMessageType } from '../../wire/types.js'
import { BaseNetwork } from '../network.js'
import { NetworkId } from '../types.js'

import {
  BeaconLightClientNetworkContentType,
  HistoricalSummariesKey,
  HistoricalSummariesWithProof,
  LightClientBootstrapKey,
  LightClientFinalityUpdateKey,
  LightClientOptimisticUpdateKey,
  LightClientUpdatesByRange,
  LightClientUpdatesByRangeKey,
  MIN_BOOTSTRAP_VOTES,
  SyncStrategy,
} from './types.js'
import { UltralightTransport } from './ultralightTransport.js'
import { getBeaconContentKey } from './util.js'

import type { BeaconConfig } from '@lodestar/config'
import type { LightClientUpdate } from '@lodestar/types'
import type { Debugger } from 'debug'
import type { AcceptMessage, FindContentMessage, OfferMessage } from '../../wire/types.js'
import type { ContentLookupResponse } from '../types.js'
import type { BeaconChainNetworkConfig, HistoricalSummaries, LightClientForkName } from './types.js'
import type { INodeAddress } from '../../index.js'

export class BeaconLightClientNetwork extends BaseNetwork {
  networkId: NetworkId.BeaconChainNetwork
  beaconConfig: BeaconConfig
  networkName = 'BeaconLightClientNetwork'
  logger: Debugger
  lightClient: Lightclient | undefined
  bootstrapFinder: Map<NodeId, string[] | {}>
  syncStrategy: SyncStrategy = SyncStrategy.PollNetwork
  trustedBlockRoot: string | undefined
  forkDigest: Uint8Array
  historicalSummaries: HistoricalSummaries = []
  historicalSummariesEpoch = 0n // The epoch that our local HistoricalSummaries is current to
  // TODO: Decide if we should store the proof for the Historical Summaries in memory or just in the DB
  historicalSummariesProof: Uint8Array[] = [] // The proof associated with our local HistoricalSummaries
  constructor({
    client,
    db,
    radius,
    maxStorage,
    trustedBlockRoot,
    sync,
  }: BeaconChainNetworkConfig) {
    super({ client, db, radius, maxStorage, networkId: NetworkId.BeaconChainNetwork })
    // This config is used to identify the Beacon Chain fork any given light client update is from
    const genesisRoot = hexToBytes(genesisData.mainnet.genesisValidatorsRoot)
    this.beaconConfig = createBeaconConfig(defaultChainConfig, genesisRoot)

    this.networkId = NetworkId.BeaconChainNetwork
    this.logger = debug(this.enr.nodeId.slice(0, 5))
      .extend('Portal')
      .extend('BeaconLightClientNetwork')
    this.routingTable.setLogger(this.logger)
    this.forkDigest = Uint8Array.from([0, 0, 0, 0])
    this.on('ContentAdded', async (contentKey: Uint8Array) => {
      if (contentKey[0] === BeaconLightClientNetworkContentType.LightClientUpdate) {
        // don't gossip individual LightClientUpdates since they aren't officially supported
        return
      }
      // Gossip new content to 5 random nodes in routing table
      for (let x = 0; x < 5; x++) {
        const peer = this.routingTable.random()
        if (peer !== undefined) {
          this.gossipManager.enqueue(peer.nodeId, contentKey)
          this.gossipManager['gossip'](peer)
        }
      }
    })

    // If a sync strategy is not provided, determine sync strategy based on existence of trusted block root
    if (sync !== undefined) this.syncStrategy = sync
    else if (trustedBlockRoot !== undefined) this.syncStrategy = SyncStrategy.TrustedBlockRoot
    switch (this.syncStrategy) {
      case SyncStrategy.PollNetwork:
        this.bootstrapFinder = new Map()
        this.portal.on('NodeAdded', this.getBootStrapVote)
        break
      case SyncStrategy.TrustedBlockRoot:
        if (trustedBlockRoot === undefined)
          throw new Error('must provided trusted block root with SyncStrategy.TrustedBlockRoot')
        this.bootstrapFinder = new Map()
        this.trustedBlockRoot = trustedBlockRoot
        this.portal.on('NodeAdded', this.getBootstrap)
        break
    }
  }

  /**
   * This is the private method employed by the sync strategy whereby we try to find
   * the `LightClientBootstrap` corresponding to the `trustedBlockRoot` provided when the
   * BeaconLightClientNetwork was instantiated
   * @param nodeId NodeId for a peer that was just discovered by the Portal Network `client`
   * @param network the network ID for the node just discovered
   */
  private getBootstrap = async (nodeId: string, network: NetworkId) => {
    // We check the network ID because NodeAdded is emitted regardless of network
    if (network !== NetworkId.BeaconChainNetwork) return
    const enr = getENR(this.routingTable, nodeId)
    if (enr === undefined) return
    const decoded = await this.sendFindContent(
      enr,
      concatBytes(
        new Uint8Array([BeaconLightClientNetworkContentType.LightClientBootstrap]),
        LightClientBootstrapKey.serialize({ blockHash: hexToBytes(this.trustedBlockRoot!) }),
      ),
    )
    if (decoded !== undefined && 'content' in decoded) {
      const forkhash = decoded.content.slice(0, 4) as Uint8Array
      const forkname = this.beaconConfig.forkDigest2ForkName(forkhash) as LightClientForkName
      const bootstrap = ssz[forkname].LightClientBootstrap.deserialize(
        (decoded.content as Uint8Array).slice(4),
      )
      const headerHash = bytesToHex(
        ssz.phase0.BeaconBlockHeader.hashTreeRoot(bootstrap.header.beacon),
      )
      if (headerHash === this.trustedBlockRoot) {
        void this.initializeLightClient(headerHash)
        this.portal.removeListener('NodeAdded', this.getBootstrap)
      }
    }
  }

  /**
   * This is the private method employed by the sync strategy whereby we try to identify a
   * reliable starting point for starting our CL Light Client sync by polling newly found
   * Portal Network nodes for their last three Light Client updates (corresponding to the
   * 3 most recent sync periods).  Once we reach a minimum number of acceptable of votes, we
   * determine a trusted block root based on the finalized header root with the most "votes"
   * (i.e. appearances in peer responses) and try to start our sync from that point.
   * @param nodeId NodeId for a peer that was just discovered by the Portal Network `client`
   * @param network the network ID for the node just discovered
   */
  private getBootStrapVote = async (nodeId: string, network: NetworkId) => {
    try {
      if (network === NetworkId.BeaconChainNetwork) {
        // We check the network ID because NodeAdded is emitted regardless of network
        if (this.bootstrapFinder.has(nodeId)) {
          return
        }
        this.bootstrapFinder.set(nodeId, {} as any)
        const currentPeriod = BigInt(
          computeSyncPeriodAtSlot(
            getCurrentSlot(this.beaconConfig, genesisData.mainnet.genesisTime),
          ),
        )

        // Request the range of Light Client Updates extending back 4 sync periods
        const rangeKey = getBeaconContentKey(
          BeaconLightClientNetworkContentType.LightClientUpdatesByRange,
          LightClientUpdatesByRangeKey.serialize({ startPeriod: currentPeriod - 3n, count: 4n }),
        )
        this.logger.extend('BOOTSTRAP')(
          `Requesting recent LightClientUpdates from ${shortId(nodeId, this.routingTable)}`,
        )
        const enr = getENR(this.routingTable, nodeId)
        if (enr === undefined) return
        const range = await this.sendFindContent(enr, rangeKey)
        if (range === undefined || 'enrs' in range) return // If we don't get a range, exit early

        const updates = LightClientUpdatesByRange.deserialize(range.content as Uint8Array)

        const roots: string[] = []
        for (const update of updates) {
          const fork = this.beaconConfig.forkDigest2ForkName(
            bytesToHex(update.slice(0, 4)),
          ) as LightClientForkName
          const decoded = ssz[fork].LightClientUpdate.deserialize(
            update.slice(4),
          ) as LightClientUpdate
          roots.push(
            bytesToHex(ssz.phase0.BeaconBlockHeader.hashTreeRoot(decoded.finalizedHeader.beacon)),
          )
        }
        this.bootstrapFinder.set(nodeId, roots)
        const votes = Array.from(this.bootstrapFinder.entries()).filter(
          (el) => el[1] instanceof Array,
        )
        this.logger.extend('BOOTSTRAP')(
          `currently have ${votes.length} votes for bootstrap candidates`,
        )
        if (votes.length >= MIN_BOOTSTRAP_VOTES) {
          // If we have enough votes, determine target bootstrap
          const tally = new Map<string, number>()
          // Turn votes into a list of roots to tally up the total votes for each root
          const roots = Array.from(this.bootstrapFinder.values()).flat() as string[]
          for (const root of roots) {
            const count = tally.get(root)
            if (count !== undefined) {
              tally.set(root, count + 1)
            } else {
              tally.set(root, 1)
            }
          }
          // Sort the roots by the number of votes for each root
          const results = Array.from(tally.entries()).sort((a, b) => a[1] - b[1])
          for (let x = 0; x < votes.length; x++) {
            // If we go through all of the possible checkpoint roots that receive a simple majority
            // vote by the polled nodes, stop looking and clear out votes.
            if (results[x][1] < Math.floor(MIN_BOOTSTRAP_VOTES / 2 + 1)) break
            const bootstrapKey = getBeaconContentKey(
              BeaconLightClientNetworkContentType.LightClientBootstrap,
              LightClientBootstrapKey.serialize({ blockHash: hexToBytes(results[x][0]) }),
            )
            this.logger.extend('BOOTSTRAP')(
              `found a consensus bootstrap candidate ${results[x][0]}`,
            )
            for (const vote of votes) {
              const enr = getENR(this.routingTable, vote[0])
              if (enr === undefined) continue
              const res = await this.sendFindContent(enr, bootstrapKey)
              if (res !== undefined && 'content' in res) {
                try {
                  const fork = this.beaconConfig.forkDigest2ForkName(
                    (res.content as Uint8Array).slice(0, 4),
                  ) as LightClientForkName
                  // Verify bootstrap is valid
                  ssz[fork].LightClientBootstrap.deserialize((res.content as Uint8Array).slice(4))
                  this.logger.extend('BOOTSTRAP')(`found a valid bootstrap - ${results[x][0]}`)
                  await this.store(bootstrapKey, res.content as Uint8Array)
                  this.portal.removeListener('NodeAdded', this.getBootStrapVote)
                  this.logger.extend('BOOTSTRAP')(`Terminating Light Client bootstrap process`)
                  await this.initializeLightClient(results[x][0])
                  return
                } catch (err) {
                  this.logger.extend('BOOTSTRAP')('Something went wrong parsing bootstrap')
                  this.logger.extend('BOOTSTRAP')(err)
                  continue
                }
              }
            }
          }
          // If we get here, we didn't find a bootstrap that received a vote from a plurality
          // of nodes so purge their votes and start over
          for (const peer of this.bootstrapFinder.keys()) {
            this.bootstrapFinder.set(peer, {})
          }
        }
      }
    } catch (err) {
      this.logger.extend('BOOTSTRAP')(err)
    }
  }

  /**
   * Initializes a Lodestar light client using a trusted beacon block root
   * @param blockRoot trusted beacon block root within the weak subjectivity period for retrieving
   * the `lightClientBootStrap`
   */
  public initializeLightClient = async (blockRoot: string) => {
    // Ensure bootstrap finder mechanism is disabled if currently running
    this.portal.removeListener('NodeAdded', this.getBootStrapVote)
    this.portal.removeListener('NodeAdded', this.getBootstrap)

    // Setup the Lodestar light client logger using our debug logger
    const lcLogger = this.logger.extend('LightClient')

    const lcLoggerError = lcLogger.extend('ERROR')
    const lcLoggerWarn = lcLogger.extend('WARN')
    const lcLoggerInfo = lcLogger.extend('INFO')
    const lcLoggerDebug = lcLogger.extend('DEBUG')

    // This call instantiates a Lodestar light client that will sync the Beacon Chain using the light client sync process
    this.lightClient = await Lightclient.initializeFromCheckpointRoot({
      config: this.beaconConfig,
      genesisData: genesisData.mainnet,
      transport: new UltralightTransport(this),
      checkpointRoot: hexToBytes(blockRoot),
      logger: {
        error: (msg, context, error) => {
          msg && lcLoggerError(msg)
          context !== undefined && lcLoggerError(context)
          error && lcLoggerError(error)
        },
        warn: (msg, context) => {
          msg && lcLoggerWarn(msg)
          context !== undefined && lcLoggerWarn(context)
        },
        info: (msg, context) => {
          msg && lcLoggerInfo(msg)
          context !== undefined && lcLoggerInfo(context)
        },
        debug: (msg, context) => {
          msg && lcLoggerDebug(msg)
          context !== undefined && lcLoggerDebug(context)
        },
      },
    })

    await this.lightClient.start()
  }

  public findContentLocally = async (contentKey: Uint8Array): Promise<Uint8Array | undefined> => {
    let value
    let key

    switch (contentKey[0]) {
      case BeaconLightClientNetworkContentType.LightClientUpdatesByRange:
        try {
          value = await this.constructLightClientRange(contentKey.slice(1))
        } catch {
          // We catch here in case we don't have all of the updates requested by the range
          // in which case we shouldn't return any content
        }
        break
      case BeaconLightClientNetworkContentType.LightClientOptimisticUpdate:
        key = LightClientOptimisticUpdateKey.deserialize(contentKey.slice(1))
        this.logger.extend('FINDLOCALLY')(
          `looking for optimistic update for slot ${key.signatureSlot}`,
        )
        if (
          this.lightClient !== undefined &&
          key.signatureSlot === BigInt(this.lightClient.getHead().beacon.slot + 1)
        ) {
          // We have to check against the light client head + 1 since it will be one slot behind the current slot
          this.logger.extend('FINDLOCALLY')('found optimistic update matching light client head')
          // We only store the most recent optimistic update so only retrieve the optimistic update if the slot
          // in the key matches the current head known to our light client
          value = await this.retrieve(
            hexToBytes(intToHex(BeaconLightClientNetworkContentType.LightClientOptimisticUpdate)),
          )
        } else if (this.lightClient === undefined) {
          // If the light client isn't initialized, we just blindly store and retrieve the optimistic update we have
          value = await this.retrieve(
            hexToBytes(intToHex(BeaconLightClientNetworkContentType.LightClientOptimisticUpdate)),
          )
          this.logger.extend('FINDLOCALLY')(
            `light client is not running, retrieving whatever we have - ${
              value !== undefined ? short(value) : 'nothing found'
            }`,
          )
        } else {
          this.logger.extend('FINDLOCALLY')('tried to retrieve an optimistic update we do not have')
        }
        break
      case BeaconLightClientNetworkContentType.LightClientFinalityUpdate:
        key = LightClientFinalityUpdateKey.deserialize(contentKey.slice(1))
        this.logger.extend('FINDLOCALLY')(
          `looking for finality update for slot - ${
            key.finalitySlot
          } and local finalized update is for slot - ${
            this.lightClient?.getFinalized().beacon.slot ?? 'unavailable'
          }`,
        )
        if (
          this.lightClient !== undefined &&
          key.finalitySlot <= BigInt(this.lightClient.getFinalized().beacon.slot)
        ) {
          // We only store the most recent finality update so only retrieve the finality update if the slot
          // in the key is less than or equal to the current finalized slot known to our light client
          value = await this.retrieve(
            hexToBytes(intToHex(BeaconLightClientNetworkContentType.LightClientFinalityUpdate)),
          )
        } else if (this.lightClient === undefined) {
          // If the light client isn't initialized, we just blindly store and retrieve the finality update we have
          value = await this.retrieve(
            hexToBytes(intToHex(BeaconLightClientNetworkContentType.LightClientFinalityUpdate)),
          )
          if (value !== undefined) {
            const decoded = hexToBytes(value)
            const forkHash = decoded.slice(0, 4) as Uint8Array
            const forkName = this.beaconConfig.forkDigest2ForkName(forkHash) as LightClientForkName
            if (
              ssz[ForkName[forkName]].LightClientFinalityUpdate.deserialize(decoded.slice(4))
                .finalizedHeader.beacon.slot < Number(key.finalitySlot)
            ) {
              // If what we have stored locally is older than the finality update requested, don't send it
              value = undefined
            }
          }
        }
        break
      case BeaconLightClientNetworkContentType.HistoricalSummaries: {
        const key = HistoricalSummariesKey.deserialize(contentKey.slice(1))
        this.logger.extend('FINDLOCALLY')(
          `looking for Historical Summaries for epoch ${key.epoch.toString(10)} `,
        )
        // We store the HistoricalSummaries in memory so it can be used by History Network to verify post-Capella proofs
        if (this.historicalSummaries.length > 0) {
          value = Uint8Array.from([
            ...this.forkDigest,
            ...HistoricalSummariesWithProof.serialize({
              epoch: this.historicalSummariesEpoch,
              historicalSummaries: this.historicalSummaries,
              proof: this.historicalSummariesProof,
            }),
          ])
        } else {
          this.logger.extend('FINDLOCALLY')('Historical Summaries is not stored locally')
        }
        break
      }
      default:
        value = await this.retrieve(contentKey)
    }

    return value instanceof Uint8Array ? value : value !== undefined ? hexToBytes(value) : undefined
  }

  public sendFindContent = async (
    enr: ENR,
    key: Uint8Array,
  ): Promise<ContentLookupResponse | undefined> => {
    this.portal.metrics?.findContentMessagesSent.inc()
    const findContentMsg: FindContentMessage = { contentKey: key }
    const payload = PortalWireMessageType.serialize({
      selector: MessageCodes.FINDCONTENT,
      value: findContentMsg,
    })
    const res = await this.sendMessage(enr, payload, this.networkId)
    if (res.length === 0) {
      return undefined
    }

    try {
      let response: ContentLookupResponse
      if (bytesToInt(res.subarray(0, 1)) === MessageCodes.CONTENT) {
        this.portal.metrics?.contentMessagesReceived.inc()
        this.logger.extend('FOUNDCONTENT')(`Received from ${shortId(enr.nodeId)}`)
        const decoded = ContentMessageType.deserialize(res.subarray(1))
        switch (decoded.selector) {
          case FoundContent.UTP: {
            const id = new DataView((decoded.value as Uint8Array).buffer).getUint16(0, false)
            this.logger.extend('FOUNDCONTENT')(`received uTP Connection ID ${id}`)
            response = await new Promise((resolve, _reject) => {
              // TODO: Figure out how to clear this listener
              this.on('ContentAdded', (contentKey: Uint8Array, value) => {
                if (equalsBytes(contentKey, key)) {
                  this.logger.extend('FOUNDCONTENT')(`received content for uTP Connection ID ${id}`)
                  resolve({ content: value, utp: true })
                }
              })
              void this.handleNewRequest({
                networkId: this.networkId,
                contentKeys: [key],
                enr,
                connectionId: id,
                requestCode: RequestCode.FINDCONTENT_READ,
              })
            })
            break
          }
          case FoundContent.CONTENT:
            {
              response = { content: decoded.value as Uint8Array, utp: false }
              const forkhash = decoded.value.slice(0, 4) as Uint8Array
              const forkname = this.beaconConfig.forkDigest2ForkName(
                forkhash,
              ) as LightClientForkName
              switch (key[0]) {
                case BeaconLightClientNetworkContentType.LightClientOptimisticUpdate:
                  try {
                    ssz[forkname].LightClientOptimisticUpdate.deserialize(
                      (decoded.value as Uint8Array).slice(4),
                    )
                  } catch (err) {
                    this.logger(`received invalid content from ${shortId(enr.nodeId)}`)
                    break
                  }
                  this.logger(
                    `received LightClientOptimisticUpdate content corresponding to ${bytesToHex(key)}`,
                  )
                  await this.store(key, decoded.value as Uint8Array)
                  break
                case BeaconLightClientNetworkContentType.LightClientFinalityUpdate:
                  try {
                    ssz[forkname].LightClientFinalityUpdate.deserialize(
                      (decoded.value as Uint8Array).slice(4),
                    )
                  } catch (err) {
                    this.logger(`received invalid content from ${shortId(enr.nodeId)}`)
                    break
                  }
                  this.logger(
                    `received LightClientFinalityUpdate content corresponding to ${bytesToHex(key)}`,
                  )
                  await this.store(key, decoded.value as Uint8Array)
                  break
                case BeaconLightClientNetworkContentType.LightClientBootstrap:
                  try {
                    ssz[forkname].LightClientBootstrap.deserialize(
                      (decoded.value as Uint8Array).slice(4),
                    )
                  } catch (err) {
                    this.logger(`received invalid content from ${shortId(enr.nodeId)}`)
                    break
                  }
                  this.logger(
                    `received LightClientBootstrap content corresponding to ${bytesToHex(key)}`,
                  )
                  await this.store(key, decoded.value as Uint8Array)
                  break
                case BeaconLightClientNetworkContentType.LightClientUpdatesByRange:
                  try {
                    LightClientUpdatesByRange.deserialize((decoded.value as Uint8Array).slice(4))
                  } catch (err) {
                    this.logger(`received invalid content from ${shortId(enr.nodeId)}`)
                    break
                  }
                  this.logger(
                    `received LightClientUpdatesByRange content corresponding to ${bytesToHex(key)}`,
                  )
                  await this.storeUpdateRange(decoded.value as Uint8Array)
                  break

                default:
                  this.logger(
                    `received unexpected content type corresponding to ${bytesToHex(key)}`,
                  )
                  break
              }
            }
            break
          case FoundContent.ENRS:
            // We should never get ENRs for content on the Beacon Light Client Network since all nodes
            // are expected to maintain all of the data (basically just light client updates)
            // TODO: Determine if this is actually true
            return undefined
        }
        return response
      }
      // TODO Should we do anything other than ignore responses to FINDCONTENT messages that isn't a CONTENT response?
    } catch (err: any) {
      this.logger(`Error sending FINDCONTENT to ${shortId(enr.nodeId)} - ${err.message}`)
    }
  }

  protected override handleFindContent = async (
    src: INodeAddress,
    requestId: bigint,
    decodedContentMessage: FindContentMessage,
  ) => {
    this.portal.metrics?.contentMessagesSent.inc()

    this.logger(
      `Received FindContent request for contentKey: ${bytesToHex(
        decodedContentMessage.contentKey,
      )}`,
    )
    const value = await this.findContentLocally(decodedContentMessage.contentKey)
    if (!value) {
      await this.enrResponse(decodedContentMessage.contentKey, src, requestId)
    } else if (value !== undefined && value.length < MAX_PACKET_SIZE) {
      this.logger(
        'Found value for requested content ' +
          bytesToHex(decodedContentMessage.contentKey) +
          ' ' +
          bytesToHex(value.slice(0, 10)) +
          `...`,
      )
      const payload = ContentMessageType.serialize({
        selector: 1,
        value,
      })
      this.logger.extend('CONTENT')(`Sending requested content to ${src.nodeId}`)
      await this.sendResponse(
        src,
        requestId,
        concatBytes(Uint8Array.from([MessageCodes.CONTENT]), payload),
      )
    } else {
      this.logger.extend('FOUNDCONTENT')(
        'Found value for requested content.  Larger than 1 packet.  uTP stream needed.',
      )
      const _id = randUint16()
      const enr = this.findEnr(src.nodeId) ?? src
      await this.handleNewRequest({
        networkId: this.networkId,
        contentKeys: [decodedContentMessage.contentKey],
        enr,
        connectionId: _id,
        requestCode: RequestCode.FOUNDCONTENT_WRITE,
        contents: value,
      })

      const id = new Uint8Array(2)
      new DataView(id.buffer).setUint16(0, _id, false)
      this.logger.extend('FOUNDCONTENT')(`Sent message with CONNECTION ID: ${_id}.`)
      const payload = ContentMessageType.serialize({ selector: FoundContent.UTP, value: id })
      await this.sendResponse(
        src,
        requestId,
        concatBytes(Uint8Array.from([MessageCodes.CONTENT]), payload),
      )
    }
  }

  /**
   * The generalized `store` method used to put data into the DB
   * @param contentType the content type being stored (defined in @link { BeaconLightClientNetworkContentType })
   * @param contentKey the network level content key formatted as a prefixed hex string
   * @param value the Uint8Array corresponding to the SSZ serialized value being stored
   */
  public store = async (contentKey: Uint8Array, value: Uint8Array): Promise<void> => {
    const contentType = contentKey[0]
    switch (contentType) {
      case BeaconLightClientNetworkContentType.LightClientUpdatesByRange:
        // We need to call `storeUpdateRange` to ensure we store each individual
        // light client update separately so we can construct any range
        await this.storeUpdateRange(value)
        break
      case BeaconLightClientNetworkContentType.LightClientOptimisticUpdate:
        // We store the optimistic update by the content type rather than key since we only want to have one (the most recent)
        // optimistic update and this ensures we don't accidentally store multiple
        await this.put(
          hexToBytes(intToHex(BeaconLightClientNetworkContentType.LightClientOptimisticUpdate)),
          bytesToHex(value),
        )
        break
      case BeaconLightClientNetworkContentType.LightClientFinalityUpdate:
        // We store the optimistic update by the content type rather than key since we only want to have one (the most recent)
        // finality update and this ensures we don't accidentally store multiple
        await this.put(
          hexToBytes(intToHex(BeaconLightClientNetworkContentType.LightClientFinalityUpdate)),
          bytesToHex(value),
        )
        break
      case BeaconLightClientNetworkContentType.HistoricalSummaries: {
        const summaries = HistoricalSummariesWithProof.deserialize(value.slice(4))

        // Retrieve Finality Update from lightclient to verify HistoricalSummaries proof is current
        const finalityUpdate = this.lightClient?.getFinalized()
        if (finalityUpdate === undefined) {
          this.logger(`Unable to find finality update in order to verify Historical Summaries`)
          // TODO: Decide whether it ever makes sense to accept a HistoricalSummaries object if we don't already have a finality update to verify against
          // return
        } else {
          // TODO: Make this future proof with forkConfig
          const reconstructedStateMerkleTree = ssz.capella.BeaconState.createFromProof({
            type: ProofType.single,
            gindex: ssz.capella.BeaconState.getPathInfo(['historicalSummaries']).gindex,
            witnesses: summaries.proof,
            leaf: ssz.capella.BeaconState.fields.historicalSummaries
              .toView(summaries.historicalSummaries)
              .hashTreeRoot(),
          })
          if (
            equalsBytes(
              finalityUpdate.beacon.stateRoot,
              reconstructedStateMerkleTree.hashTreeRoot(),
            ) === false
          ) {
            // The state root for the Historical Summaries proof should match the stateroot found in the most
            // recent LightClientFinalityUpdate or we can't trust it
            this.logger(
              `Historical Summaries State Proof root does not match current Finality Update`,
            )
            return
          } else {
            this.logger(`Historical Summaries State Proof root matches current Finality Update`)
          }
        }
        // We store the HistoricalSummaries object by content type since we should only ever have one (most up to date)
        await this.put(
          hexToBytes(intToHex(BeaconLightClientNetworkContentType.HistoricalSummaries)),
          bytesToHex(value),
        )

        // Store the Historical Summaries data in memory so can be accessed easily by the History Network
        this.forkDigest = value.slice(0, 4)
        this.historicalSummaries = summaries.historicalSummaries
        this.historicalSummariesEpoch = summaries.epoch
        this.historicalSummariesProof = summaries.proof
        break
      }
      default:
        await this.put(contentKey, bytesToHex(value))
    }

    this.logger(
      `storing ${BeaconLightClientNetworkContentType[contentType]} content corresponding to ${bytesToHex(contentKey)}`,
    )
    this.emit('ContentAdded', contentKey, value)
  }

  /**
   * Specialized store method for the LightClientUpdatesByRange object since this object is not stored
   * directly in the DB but constructed from one or more Light Client Updates which are stored directly
   * @param range - an SSZ serialized LightClientUpdatesByRange object as defined in the Portal Network Specs
   */
  public storeUpdateRange = async (range: Uint8Array) => {
    const deserializedRange = LightClientUpdatesByRange.deserialize(range)
    for (const update of deserializedRange) {
      await this.store(this.computeLightClientUpdateKey(update), update)
    }
  }

  // TODO: Move this to util and detach from the network
  /**
   * This is a helper method for computing the key used to store individual LightClientUpdates in the DB
   * @param update An ssz serialized LightClientUpdate as a Uint8Array for a given sync period
   * or the number corresponding to the sync period update desired
   * @returns the hex prefixed string version of the Light Client Update storage key
   * (0x04 + hexidecimal representation of the sync committee period)
   */
  public computeLightClientUpdateKey = (input: Uint8Array | number) => {
    let period
    if (typeof input === 'number') {
      period = input
    } else {
      const forkhash = input.slice(0, 4) as Uint8Array
      const forkName = this.beaconConfig.forkDigest2ForkName(forkhash) as LightClientForkName
      const deserializedUpdate = ssz[ForkName[forkName]].LightClientUpdate.deserialize(
        input.slice(4),
      ) as LightClientUpdate
      period = computeSyncPeriodAtSlot(deserializedUpdate.attestedHeader.beacon.slot)
    }
    return hexToBytes(
      '0x' +
        BeaconLightClientNetworkContentType.LightClientUpdate.toString(16) +
        padToEven(period.toString(16)),
    )
  }

  /**
   * Internal helper called by `findContentLocally` to construct the LightClientUpdatesByRange object as defined in the
   * Portal Network Specs
   * @param contentKey a raw LightClientUpdatesByRange key as defined in the Portal Network Specs (not the content key prefixed with
   * the content type of 1)
   * @returns an SSZ serialized LightClientUpdatesByRange object as a Uint8Array
   */
  private constructLightClientRange = async (contentKey: Uint8Array) => {
    const rangeKey = LightClientUpdatesByRangeKey.deserialize(contentKey)

    if (rangeKey.count > 128n) {
      throw new Error('cannot request more than 128 updates')
    }
    const count = Number(rangeKey.count)
    const start = Number(rangeKey.startPeriod)
    const range = []

    for (let x = start; x < start + count; x++) {
      const update = await this.retrieve(this.computeLightClientUpdateKey(x))
      if (update === undefined) {
        // TODO: Decide what to do about updates not found in DB
        throw new Error('update not found in DB')
      }
      range.push(hexToBytes(update))
    }
    return LightClientUpdatesByRange.serialize(range)
  }

  /**
   * Offers content corresponding to `contentKeys` to peer corresponding to `dstId`
   * @param dstId node ID of a peer
   * @param contentKeys content keys being offered as specified by the subnetwork
   */
  public override sendOffer = async (
    enr: ENR,
    contentKeys: Uint8Array[],
    contents?: Uint8Array[],
  ) => {
    if (contents && contents.length !== contentKeys.length) {
      throw new Error('Provided Content and content key arrays must be the same length')
    }
    if (contentKeys.length > 0) {
      this.portal.metrics?.offerMessagesSent.inc()
      const offerMsg: OfferMessage = {
        contentKeys,
      }
      const payload = PortalWireMessageType.serialize({
        selector: MessageCodes.OFFER,
        value: offerMsg,
      })
      this.logger.extend(`OFFER`)(
        `Sent to ${shortId(enr.nodeId)} with ${contentKeys.length} pieces of content`,
      )
      const res = await this.sendMessage(enr, payload, this.networkId)
      if (res.length > 0) {
        try {
          const decoded = PortalWireMessageType.deserialize(res)
          if (decoded.selector === MessageCodes.ACCEPT) {
            this.portal.metrics?.acceptMessagesReceived.inc()
            const msg = decoded.value as AcceptMessage
            const id = new DataView(msg.connectionId.buffer).getUint16(0, false)
            // Initiate uTP streams with serving of requested content
            const requestedKeys: Uint8Array[] = contentKeys.filter(
              (n, idx) => msg.contentKeys.get(idx) === true,
            )
            if (requestedKeys.length === 0) {
              // Don't start uTP stream if no content ACCEPTed
              this.logger.extend('ACCEPT')(`No content ACCEPTed by ${shortId(enr.nodeId)}`)
              return []
            }
            this.logger.extend(`ACCEPT`)(`ACCEPT message received with uTP id: ${id}`)

            const requestedData: Uint8Array[] = []
            if (contents) {
              for (const [idx, _] of requestedKeys.entries()) {
                if (msg.contentKeys.get(idx) === true) {
                  requestedData.push(contents[idx])
                }
              }
            } else {
              for await (const key of requestedKeys) {
                let value = Uint8Array.from([])
                try {
                  // We use `findContentLocally` instead of `get` so the content keys for
                  // optimistic and finality updates are handled correctly
                  value = (await this.findContentLocally(key)) as Uint8Array
                  requestedData.push(value)
                } catch (err: any) {
                  this.logger(`Error retrieving content -- ${err.toString()}`)
                  requestedData.push(value)
                }
              }
            }

            const encoded = encodeWithVariantPrefix(requestedData)
            await this.handleNewRequest({
              networkId: this.networkId,
              contentKeys: requestedKeys,
              enr,
              connectionId: id,
              requestCode: RequestCode.OFFER_WRITE,
              contents: encoded,
            })

            return msg.contentKeys
          }
        } catch (err: any) {
          this.logger(`Error sending to ${shortId(enr.nodeId)} - ${err.message}`)
        }
      }
    }
  }

  /**
   * We override the BaseNetwork `handleOffer` since content gossip for the Beacon Light client network
   * assumes that all node have all of hthe
   * @param src OFFERing node's address
   * @param requestId request ID passed in OFFER message
   * @param msg OFFER message containing a list of offered content keys
   */
  override handleOffer = async (src: INodeAddress, requestId: bigint, msg: OfferMessage) => {
    this.logger.extend('OFFER')(
      `Received from ${shortId(src.nodeId, this.routingTable)} with ${
        msg.contentKeys.length
      } pieces of content.`,
    )
    try {
      if (msg.contentKeys.length > 0) {
        let offerAccepted = false

        const contentIds: boolean[] = Array(msg.contentKeys.length).fill(false)

        for (let x = 0; x < msg.contentKeys.length; x++) {
          const key = msg.contentKeys[x]
          switch (key[0]) {
            case BeaconLightClientNetworkContentType.LightClientBootstrap: {
              try {
                // TODO: Verify the offered bootstrap isn't too old before accepting
                await this.get(key)
                this.logger.extend('OFFER')(`Already have this content ${msg.contentKeys[x]}`)
              } catch (err) {
                offerAccepted = true
                contentIds[x] = true
                this.logger.extend('OFFER')(
                  `Found some interesting content from ${shortId(src.nodeId, this.routingTable)}`,
                )
              }
              break
            }
            case BeaconLightClientNetworkContentType.LightClientFinalityUpdate:
              {
                const slot = LightClientFinalityUpdateKey.deserialize(key.slice(1)).finalitySlot
                if (
                  this.lightClient !== undefined &&
                  slot > this.lightClient.getFinalized().beacon.slot
                ) {
                  offerAccepted = true
                  contentIds[x] = true
                  this.logger.extend('OFFER')(
                    `Found a newer Finalized Update from ${shortId(
                      src.nodeId,
                      this.routingTable,
                    )} corresponding to slot ${slot}`,
                  )
                }
              }
              break
            case BeaconLightClientNetworkContentType.LightClientOptimisticUpdate:
              {
                const slot = LightClientOptimisticUpdateKey.deserialize(key.slice(1)).signatureSlot
                if (
                  this.lightClient !== undefined &&
                  slot > this.lightClient.getHead().beacon.slot + 1
                ) {
                  // We have to check against the light client head + 1 since it will be one slot behind the current slot
                  offerAccepted = true
                  contentIds[x] = true
                  this.logger.extend('OFFER')(
                    `Found a newer Optimstic Update from ${shortId(
                      src.nodeId,
                      this.routingTable,
                    )} corresponding to slot ${slot}`,
                  )
                }
              }
              break
            case BeaconLightClientNetworkContentType.LightClientUpdatesByRange: {
              // TODO: See if any of the updates in the range are missing and either ACCEPT or send FINDCONTENT for the missing range
              break
            }
            case BeaconLightClientNetworkContentType.HistoricalSummaries: {
              const epoch = HistoricalSummariesKey.deserialize(key.slice(1)).epoch
              // Only accept if offered HistoricalSummaries epoch corresponds to our current finalityUpdate epoch (otherwise we can't verify)
              this.logger.extend('OFFER')(
                `Received an offer for Historical Summaries for epoch ${epoch.toString(10)}`,
              )
              if (
                this.lightClient &&
                epoch === BigInt(Math.floor(this.lightClient?.getFinalized().beacon.slot / 8192))
              ) {
                offerAccepted = true
                contentIds[x] = true
                this.logger.extend('OFFER')(
                  `Found an up to date HistoricalSummaries object from ${shortId(
                    src.nodeId,
                    this.routingTable,
                  )}`,
                )
              }
            }
          }
        }
        if (offerAccepted) {
          this.logger.extend('OFFER')(`Accepting an OFFER`)
          const desiredKeys = msg.contentKeys.filter((k, i) => contentIds[i] === true)
          this.logger(bytesToHex(msg.contentKeys[0]))
          await this.sendAccept(src, requestId, contentIds, desiredKeys)
        } else {
          this.logger.extend('OFFER')(`Declining an OFFER since no interesting content`)
          await this.sendAccept(src, requestId, contentIds, [])
        }
      } else {
        this.logger(`Offer Message Has No Content`)
        // Send empty response if something goes wrong parsing content keys
        await this.sendResponse(src, requestId, new Uint8Array())
      }
    } catch {
      this.logger(`Error Processing OFFER msg`)
    }
  }
}
