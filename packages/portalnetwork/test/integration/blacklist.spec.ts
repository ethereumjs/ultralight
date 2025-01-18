import { SignableENR } from "@chainsafe/enr"
import { keys } from "@libp2p/crypto"
import { multiaddr } from "@multiformats/multiaddr"
import { hexToBytes } from "ethereum-cryptography/utils"
import { assert, describe, it } from "vitest"
import type { HistoryNetwork } from "../../src";
import { NetworkId, PortalNetwork, TransportLayer } from "../../src/index.js"
const privateKeys = [
    '0x0a2700250802122102273097673a2948af93317235d2f02ad9cf3b79a34eeb37720c5f19e09f11783c12250802122102273097673a2948af93317235d2f02ad9cf3b79a34eeb37720c5f19e09f11783c1a2408021220aae0fff4ac28fdcdf14ee8ecb591c7f1bc78651206d86afe16479a63d9cb73bd',
    '0x0a27002508021221039909a8a7e81dbdc867480f0eeb7468189d1e7a1dd7ee8a13ee486c8cbd743764122508021221039909a8a7e81dbdc867480f0eeb7468189d1e7a1dd7ee8a13ee486c8cbd7437641a2408021220c6eb3ae347433e8cfe7a0a195cc17fc8afcd478b9fb74be56d13bccc67813130',
  ]
const pk1 = keys.privateKeyFromProtobuf(hexToBytes(privateKeys[0]).slice(-36))
const enr1 = SignableENR.createFromPrivateKey(pk1)
const pk2 = keys.privateKeyFromProtobuf(hexToBytes(privateKeys[1]).slice(-36))
const enr2 = SignableENR.createFromPrivateKey(pk2)

describe('black list test', async () => {
  const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/5030`)
  enr1.setLocationMultiaddr(initMa)
  const initMa2: any = multiaddr(`/ip4/127.0.0.1/udp/5031`)
  enr2.setLocationMultiaddr(initMa2)
  const node1 = await PortalNetwork.create({
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
  const node2 = await PortalNetwork.create({
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
  it('should blacklist peer', () => {
    assert.isTrue(node1.isBlackListed(node2.discv5.enr.getLocationMultiaddr('udp')!))
  })
  const pong2 = await network2?.sendPing(network1?.enr!.toENR())
  it('blacklisted peer should not be able to ping', () => {
    assert.isUndefined(pong2)
  })
  it('should remove peer from blacklist', async () => {
    node1.removeFromBlackList(node2.discv5.enr.getLocationMultiaddr('udp')!)
    assert.isFalse(node1.isBlackListed(node2.discv5.enr.getLocationMultiaddr('udp')!))
    const pong3 = await network2?.sendPing(network1?.enr!.toENR())
    assert.isDefined(pong3)
  })
})