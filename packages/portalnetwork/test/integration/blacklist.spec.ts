import { SignableENR } from '@chainsafe/enr'
import { keys } from '@libp2p/crypto'
import { multiaddr } from '@multiformats/multiaddr'
import { hexToBytes } from 'ethereum-cryptography/utils'
import { assert, describe, it } from 'vitest'
import type { HistoryNetwork } from '../../src'
import {
  MessageCodes,
  NetworkId,
  PortalWireMessageType,
  SupportedVersions,
  TransportLayer,
  createPortalNetwork,
} from '../../src/index.js'
const privateKeys = [
  '0x0a2700250802122102273097673a2948af93317235d2f02ad9cf3b79a34eeb37720c5f19e09f11783c12250802122102273097673a2948af93317235d2f02ad9cf3b79a34eeb37720c5f19e09f11783c1a2408021220aae0fff4ac28fdcdf14ee8ecb591c7f1bc78651206d86afe16479a63d9cb73bd',
  '0x0a27002508021221039909a8a7e81dbdc867480f0eeb7468189d1e7a1dd7ee8a13ee486c8cbd743764122508021221039909a8a7e81dbdc867480f0eeb7468189d1e7a1dd7ee8a13ee486c8cbd7437641a2408021220c6eb3ae347433e8cfe7a0a195cc17fc8afcd478b9fb74be56d13bccc67813130',
]
const pk1 = keys.privateKeyFromProtobuf(hexToBytes(privateKeys[0]).slice(-36))
const enr1 = SignableENR.createFromPrivateKey(pk1)
const pk2 = keys.privateKeyFromProtobuf(hexToBytes(privateKeys[1]).slice(-36))
const enr2 = SignableENR.createFromPrivateKey(pk2)

describe('black list test', async () => {
  const initMa: any = multiaddr('/ip4/127.0.0.1/udp/5030')
  enr1.setLocationMultiaddr(initMa)
  const initMa2: any = multiaddr('/ip4/127.0.0.1/udp/5031')
  enr2.setLocationMultiaddr(initMa2)
  const node1 = await createPortalNetwork({
    transport: TransportLayer.NODE,
    supportedNetworks: [{ networkId: NetworkId.HistoryNetwork }],
    config: {
      enr: enr1,
      bindAddrs: {
        ip4: initMa,
      },
      privateKey: pk1,
    },
  })
  const node2 = await createPortalNetwork({
    transport: TransportLayer.NODE,
    supportedNetworks: [{ networkId: NetworkId.HistoryNetwork }],
    config: {
      enr: enr2,
      bindAddrs: {
        ip4: initMa2,
      },
      privateKey: pk2,
    },
  })

  await node1.start()
  await node2.start()
  const network1 = node1.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork
  const network2 = node2.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork
  const pong = await network1?.sendPing(network2?.enr!.toENR())
  it('should ping peer', () => {
    assert.isDefined(pong)
  })
  node1.addToBlackList(node2.discv5.enr.getLocationMultiaddr('udp')!)
  const blacklisted = node1.isBlackListed(node2.discv5.enr.getLocationMultiaddr('udp')!)
  it('should blacklist peer', () => {
    assert.isTrue(blacklisted)
  })
  const pong2 = await network2?.sendPing(network1?.enr!.toENR())
  it('blacklisted peer should not be able to ping', () => {
    assert.isUndefined(pong2)
  })
  node1.removeFromBlackList(node2.discv5.enr.getLocationMultiaddr('udp')!)
  const stillBlacklisted = node1.isBlackListed(node2.discv5.enr.getLocationMultiaddr('udp')!)
  const pong3 = await network2?.sendPing(network1?.enr!.toENR())
  it('should remove peer from blacklist', async () => {
    assert.isFalse(stillBlacklisted)
    assert.isDefined(pong3)
  })
})

describe('version conflict', async () => {
  const initMa: any = multiaddr('/ip4/127.0.0.1/udp/5032')
  enr1.setLocationMultiaddr(initMa)
  const initMa2: any = multiaddr('/ip4/127.0.0.1/udp/5033')
  enr2.setLocationMultiaddr(initMa2)
  const node1 = await createPortalNetwork({
    transport: TransportLayer.NODE,
    supportedNetworks: [{ networkId: NetworkId.HistoryNetwork }],
    config: {
      enr: enr1,
      bindAddrs: {
        ip4: initMa,
      },
      privateKey: pk1,
    },
    supportedVersions: [2],
  })
  const node2 = await createPortalNetwork({
    transport: TransportLayer.NODE,
    supportedNetworks: [{ networkId: NetworkId.HistoryNetwork }],
    config: {
      enr: enr2,
      bindAddrs: {
        ip4: initMa2,
      },
      privateKey: pk2,
    },
    supportedVersions: [0, 1],
  })

  await node1.start()
  await node2.start()
  const network1 = node1.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork
  const network2 = node2.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork

  it('should encode versions in enrs', () => {
    const versions = node1.discv5.enr.kvs.get('pv')
    assert.isDefined(versions)
    assert.deepEqual(SupportedVersions.deserialize(versions), [2])
  })
  const control = node1.isBlackListed(node2.discv5.enr.getLocationMultiaddr('udp')!)
  it('should begin with no blacklist', async () => {
    assert.isFalse(control)
  })

  // const pong = await network1?.sendPing(network2?.enr!.toENR())
  // Send a PING (bypass version conflict)
  const pingMsg = PortalWireMessageType[0].serialize({
    selector: MessageCodes.PING,
    value: {
      enrSeq: node1.discv5.enr.seq,
      payloadType: 0,
      customPayload: network1.pingPongPayload(0),
    },
  })
  const res = await network1?.sendMessage(
    node2.discv5.enr.toENR(),
    pingMsg,
    NetworkId.HistoryNetwork,
  )

  it('should fail to ping peer with version conflict', async () => {
    assert.deepEqual(res, Uint8Array.from([]))
  })
  const blacklisted = node2.isBlackListed(node1.discv5.enr.getLocationMultiaddr('udp')!)
  it('should blacklist peer with version conflict', async () => {
    assert.isTrue(blacklisted)
  })

  it('should compare versions', async () => {
    try {
      await node1.highestCommonVersion(node2.discv5.enr.toENR())
      assert.fail('should have thrown')
    } catch (e) {
      assert.equal(e.message, `No common version found with ${enr2.nodeId}`)
    }
  })
})
