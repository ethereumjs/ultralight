import { readFileSync } from 'fs'
import { resolve } from 'path'
import { SignableENR } from '@chainsafe/enr'
import { BitArray } from '@chainsafe/ssz'
import { hexToBytes } from '@ethereumjs/util'
import { keys } from '@libp2p/crypto'
import { multiaddr } from '@multiformats/multiaddr'
import yaml from 'js-yaml'
import { assert, describe, it } from 'vitest'
import type { HistoryNetwork } from '../../src/index.js'
import { AcceptCode, NetworkId, TransportLayer, createPortalNetwork } from '../../src/index.js'
const testdata = yaml.load(
  readFileSync(
    resolve(__dirname, '../../../portal-spec-tests/tests/mainnet/history/receipts/14764013.yaml'),
    {
      encoding: 'utf-8',
    },
  ),
) as {
  content_key: string
  content_value: string
}

const privateKeys = [
  '0x0a2700250802122102273097673a2948af93317235d2f02ad9cf3b79a34eeb37720c5f19e09f11783c12250802122102273097673a2948af93317235d2f02ad9cf3b79a34eeb37720c5f19e09f11783c1a2408021220aae0fff4ac28fdcdf14ee8ecb591c7f1bc78651206d86afe16479a63d9cb73bd',
  '0x0a27002508021221039909a8a7e81dbdc867480f0eeb7468189d1e7a1dd7ee8a13ee486c8cbd743764122508021221039909a8a7e81dbdc867480f0eeb7468189d1e7a1dd7ee8a13ee486c8cbd7437641a2408021220c6eb3ae347433e8cfe7a0a195cc17fc8afcd478b9fb74be56d13bccc67813130',
]

const pk1 = keys.privateKeyFromProtobuf(hexToBytes(privateKeys[0]).slice(-36))
const enr1 = SignableENR.createFromPrivateKey(pk1)
const pk2 = keys.privateKeyFromProtobuf(hexToBytes(privateKeys[1]).slice(-36))
const enr2 = SignableENR.createFromPrivateKey(pk2)
let port = 8000

describe('FindContent versions', async () => {
  it('should get test content', () => {
    assert.exists(testdata.content_key)
    assert.exists(testdata.content_value)
  })

  it('works with 0 / 0', async () => {
    const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/${port++}`)
    enr1.setLocationMultiaddr(initMa)
    const initMa2: any = multiaddr(`/ip4/127.0.0.1/udp/${port++}`)
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
      supportedVersions: [0],
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
      supportedVersions: [0],
    })

    await node1.start()
    await node2.start()
    const network1 = node1.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork
    const network2 = node2.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork

    await network1.store(hexToBytes(testdata.content_key), hexToBytes(testdata.content_value))

    const stored = await network1.findContentLocally(hexToBytes(testdata.content_key))
    assert.exists(stored)
    assert.deepEqual(stored, hexToBytes(testdata.content_value))

    const found = await network2.sendFindContent(
      node1.discv5.enr.toENR(),
      hexToBytes(testdata.content_key),
    )
    assert.exists(found)
    assert.isTrue('content' in found)
    'content' in found && assert.deepEqual(found.content, hexToBytes(testdata.content_value))
  })
  it('works with 0 / [0, 1]', async () => {
    const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/${port++}`)
    enr1.setLocationMultiaddr(initMa)
    const initMa2: any = multiaddr(`/ip4/127.0.0.1/udp/${port++}`)
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
      supportedVersions: [0],
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

    await network1.store(hexToBytes(testdata.content_key), hexToBytes(testdata.content_value))

    const stored = await network1.findContentLocally(hexToBytes(testdata.content_key))
    assert.exists(stored)
    assert.deepEqual(stored, hexToBytes(testdata.content_value))

    const found = await network2.sendFindContent(
      node1.discv5.enr.toENR(),
      hexToBytes(testdata.content_key),
    )
    assert.exists(found)
    assert.isTrue('content' in found)
    'content' in found && assert.deepEqual(found.content, hexToBytes(testdata.content_value))
  })
  it('works with [0, 1] / 0', async () => {
    const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/${port++}`)
    enr1.setLocationMultiaddr(initMa)
    const initMa2: any = multiaddr(`/ip4/127.0.0.1/udp/${port++}`)
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
      supportedVersions: [0, 1],
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
      supportedVersions: [0],
    })

    await node1.start()
    await node2.start()
    const network1 = node1.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork
    const network2 = node2.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork

    await network1.store(hexToBytes(testdata.content_key), hexToBytes(testdata.content_value))

    const stored = await network1.findContentLocally(hexToBytes(testdata.content_key))
    assert.exists(stored)
    assert.deepEqual(stored, hexToBytes(testdata.content_value))

    const found = await network2.sendFindContent(
      node1.discv5.enr.toENR(),
      hexToBytes(testdata.content_key),
    )
    assert.exists(found)
    assert.isTrue('content' in found)
    'content' in found && assert.deepEqual(found.content, hexToBytes(testdata.content_value))
  })
  it('works with [0, 1] / [0, 1]', async () => {
    const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/${port++}`)
    enr1.setLocationMultiaddr(initMa)
    const initMa2: any = multiaddr(`/ip4/127.0.0.1/udp/${port++}`)
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
      supportedVersions: [0, 1],
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

    await network1.store(hexToBytes(testdata.content_key), hexToBytes(testdata.content_value))

    const stored = await network1.findContentLocally(hexToBytes(testdata.content_key))
    assert.exists(stored)
    assert.deepEqual(stored, hexToBytes(testdata.content_value))

    const found = await network2.sendFindContent(
      node1.discv5.enr.toENR(),
      hexToBytes(testdata.content_key),
    )
    assert.exists(found)
    assert.isTrue('content' in found)
    'content' in found && assert.deepEqual(found.content, hexToBytes(testdata.content_value))
  })
  it('fails with version mismatch', async () => {
    const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/${port++}`)
    enr1.setLocationMultiaddr(initMa)
    const initMa2: any = multiaddr(`/ip4/127.0.0.1/udp/${port++}`)
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
      supportedVersions: [0],
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
      supportedVersions: [1],
    })

    await node1.start()
    await node2.start()
    const network1 = node1.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork
    const network2 = node2.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork

    await network1.store(hexToBytes(testdata.content_key), hexToBytes(testdata.content_value))

    const stored = await network1.findContentLocally(hexToBytes(testdata.content_key))
    assert.exists(stored)
    assert.deepEqual(stored, hexToBytes(testdata.content_value))

    const found = await network2.sendFindContent(
      node1.discv5.enr.toENR(),
      hexToBytes(testdata.content_key),
    )
    assert.notExists(found)
  })
})

describe('Offer/Accept versions', async () => {
  it('works with 0 / 0', async () => {
    const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/${port++}`)
    enr1.setLocationMultiaddr(initMa)
    const initMa2: any = multiaddr(`/ip4/127.0.0.1/udp/${port++}`)
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
      supportedVersions: [0],
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
      supportedVersions: [0],
    })

    await node1.start()
    await node2.start()
    const network1 = node1.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork

    await network1.store(hexToBytes(testdata.content_key), hexToBytes(testdata.content_value))

    const stored = await network1.findContentLocally(hexToBytes(testdata.content_key))
    assert.exists(stored)
    assert.deepEqual(stored, hexToBytes(testdata.content_value))

    const offer = await network1.sendOffer(node2.discv5.enr.toENR(), [
      hexToBytes(testdata.content_key),
    ])
    assert.exists(offer)
    assert.isTrue(offer instanceof BitArray)
  })
  it('works with 1 / 1', async () => {
    const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/${port++}`)
    enr1.setLocationMultiaddr(initMa)
    const initMa2: any = multiaddr(`/ip4/127.0.0.1/udp/${port++}`)
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
      supportedVersions: [1],
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
      supportedVersions: [1],
    })

    await node1.start()
    await node2.start()
    const network1 = node1.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork

    await network1.store(hexToBytes(testdata.content_key), hexToBytes(testdata.content_value))

    const stored = await network1.findContentLocally(hexToBytes(testdata.content_key))
    assert.exists(stored)
    assert.deepEqual(stored, hexToBytes(testdata.content_value))

    const offer = await network1.sendOffer(node2.discv5.enr.toENR(), [
      hexToBytes(testdata.content_key),
    ])
    assert.exists(offer)
    assert.isTrue(offer instanceof Uint8Array)
  })
  it('defaults to lowest common version', async () => {
    const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/${port++}`)
    enr1.setLocationMultiaddr(initMa)
    const initMa2: any = multiaddr(`/ip4/127.0.0.1/udp/${port++}`)
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
      supportedVersions: [0, 1],
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
      supportedVersions: [0],
    })

    await node1.start()
    await node2.start()
    const network1 = node1.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork

    await network1.store(hexToBytes(testdata.content_key), hexToBytes(testdata.content_value))

    const stored = await network1.findContentLocally(hexToBytes(testdata.content_key))
    assert.exists(stored)
    assert.deepEqual(stored, hexToBytes(testdata.content_value))

    const offer = await network1.sendOffer(node2.discv5.enr.toENR(), [
      hexToBytes(testdata.content_key),
    ])
    assert.exists(offer)
    assert.isTrue(offer instanceof BitArray)
  })
  it('fails with version mismatch', async () => {
    const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/${port++}`)
    enr1.setLocationMultiaddr(initMa)
    const initMa2: any = multiaddr(`/ip4/127.0.0.1/udp/${port++}`)
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
      supportedVersions: [1],
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
      supportedVersions: [0],
    })

    await node1.start()
    await node2.start()
    const network1 = node1.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork

    await network1.store(hexToBytes(testdata.content_key), hexToBytes(testdata.content_value))

    const stored = await network1.findContentLocally(hexToBytes(testdata.content_key))
    assert.exists(stored)
    assert.deepEqual(stored, hexToBytes(testdata.content_value))

    const offer = await network1.sendOffer(node2.discv5.enr.toENR(), [
      hexToBytes(testdata.content_key),
    ])
    assert.isUndefined(offer)
  })
  it('version 1 - Decline already stored', async () => {
    const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/${port++}`)
    enr1.setLocationMultiaddr(initMa)
    const initMa2: any = multiaddr(`/ip4/127.0.0.1/udp/${port++}`)
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
      supportedVersions: [1],
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
      supportedVersions: [1],
    })

    await node1.start()
    await node2.start()
    const network1 = node1.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork
    const network2 = node2.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork

    await network1.store(hexToBytes(testdata.content_key), hexToBytes(testdata.content_value))
    await network2.store(hexToBytes(testdata.content_key), hexToBytes(testdata.content_value))

    const stored = await network1.findContentLocally(hexToBytes(testdata.content_key))
    assert.exists(stored)
    assert.deepEqual(stored, hexToBytes(testdata.content_value))

    const offer = await network1.sendOffer(node2.discv5.enr.toENR(), [
      hexToBytes(testdata.content_key),
    ])
    assert.exists(offer)
    assert.equal(offer[0], AcceptCode.CONTENT_ALREADY_STORED)
  })
  it('version 1 - Decline outside radius', async () => {
    const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/${port++}`)
    enr1.setLocationMultiaddr(initMa)
    const initMa2: any = multiaddr(`/ip4/127.0.0.1/udp/${port++}`)
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
      supportedVersions: [1],
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
      supportedVersions: [1],
    })

    await node1.start()
    await node2.start()
    const network1 = node1.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork
    const network2 = node2.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork

    await network1.store(hexToBytes(testdata.content_key), hexToBytes(testdata.content_value))
    await network2.setRadius(0n)

    const stored = await network1.findContentLocally(hexToBytes(testdata.content_key))
    assert.exists(stored)
    assert.deepEqual(stored, hexToBytes(testdata.content_value))

    const offer = await network1.sendOffer(node2.discv5.enr.toENR(), [
      hexToBytes(testdata.content_key),
    ])
    assert.exists(offer)
    assert.equal(offer[0], AcceptCode.CONTENT_OUT_OF_RADIUS)
  })
  it('version 1 - Decline rate limit', async () => {
    const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/${port++}`)
    enr1.setLocationMultiaddr(initMa)
    const initMa2: any = multiaddr(`/ip4/127.0.0.1/udp/${port++}`)
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
      supportedVersions: [1],
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
      supportedVersions: [1],
    })

    await node1.start()
    await node2.start()
    const network1 = node1.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork
    const network2 = node2.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork

    await network1.store(hexToBytes(testdata.content_key), hexToBytes(testdata.content_value))

    network2.MAX_CONCURRENT_UTP_STREAMS = -1

    const stored = await network1.findContentLocally(hexToBytes(testdata.content_key))
    assert.exists(stored)
    assert.deepEqual(stored, hexToBytes(testdata.content_value))

    const offer = await network1.sendOffer(node2.discv5.enr.toENR(), [
      hexToBytes(testdata.content_key),
    ])
    assert.exists(offer)
    assert.equal(offer[0], AcceptCode.RATE_LIMITED)
  })
})
