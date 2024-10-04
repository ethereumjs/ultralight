import { SignableENR } from '@chainsafe/enr'
import { Trie } from '@ethereumjs/trie'
import { Account, hexToBytes } from '@ethereumjs/util'
import { keys } from '@libp2p/crypto'
import { multiaddr } from '@multiformats/multiaddr'
import { assert, describe, expect, it } from 'vitest'

import {
  AccountTrieNodeContentKey,
  AccountTrieNodeOffer,
  AccountTrieNodeRetrieval,
  NetworkId,
  PortalNetwork,
  TransportLayer,
  fromHexString,
} from '../../src/index.js'
import samples from '../networks/state/testdata/accountNodeSamples.json'

import type { StateNetwork } from '../../src'

const trie = new Trie({ useKeyHashing: true })

const privateKeys = [
  '0x0a2700250802122102273097673a2948af93317235d2f02ad9cf3b79a34eeb37720c5f19e09f11783c12250802122102273097673a2948af93317235d2f02ad9cf3b79a34eeb37720c5f19e09f11783c1a2408021220aae0fff4ac28fdcdf14ee8ecb591c7f1bc78651206d86afe16479a63d9cb73bd',
  '0x0a27002508021221039909a8a7e81dbdc867480f0eeb7468189d1e7a1dd7ee8a13ee486c8cbd743764122508021221039909a8a7e81dbdc867480f0eeb7468189d1e7a1dd7ee8a13ee486c8cbd7437641a2408021220c6eb3ae347433e8cfe7a0a195cc17fc8afcd478b9fb74be56d13bccc67813130',
]
const sample = samples[0]
const [key, value] = sample as [string, object]
const content = Uint8Array.from(Object.values(value))
const contentKey = fromHexString(key)
const decoded = AccountTrieNodeContentKey.decode(contentKey)
const deserialized = AccountTrieNodeOffer.deserialize(content)
const { path } = decoded
const { proof, blockHash } = deserialized

const pk1 = keys.privateKeyFromProtobuf(hexToBytes(privateKeys[0]).slice(-36))
const enr1 = SignableENR.createFromPrivateKey(pk1)
const pk2 = keys.privateKeyFromProtobuf(hexToBytes(privateKeys[1]).slice(-36))
const enr2 = SignableENR.createFromPrivateKey(pk2)
describe('AccountTrieNode Gossip / Request', async () => {
  const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/3020`)
  enr1.setLocationMultiaddr(initMa)
  const initMa2: any = multiaddr(`/ip4/127.0.0.1/udp/3021`)
  enr2.setLocationMultiaddr(initMa2)
  const node1 = await PortalNetwork.create({
    transport: TransportLayer.NODE,
    supportedNetworks: [{ networkId: NetworkId.StateNetwork }],
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
    supportedNetworks: [{ networkId: NetworkId.StateNetwork }],
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
  const network1 = node1.networks.get(NetworkId.StateNetwork) as StateNetwork
  const network2 = node2.networks.get(NetworkId.StateNetwork) as StateNetwork
  network1.nodeRadius = 2n ** 254n - 1n
  network2.nodeRadius = 2n ** 254n - 1n
  await network1!.sendPing(network2?.enr!.toENR())
  const storedEnr = network2.routingTable.getWithPending(node1.discv5.enr.nodeId)
  it('should find another node', async () => {
    assert.equal(
      storedEnr?.value.nodeId,
      node1.discv5.enr.nodeId,
      'found another node that supports state network',
    )
  })

  const result1 = await network1.receiveAccountTrieNodeOffer(contentKey, content)
  const result2 = await network2.receiveAccountTrieNodeOffer(contentKey, content)
  it('should store some content', async () => {
    expect(result1.stored).toBeGreaterThan(0)
    expect(result1.stored).toEqual(1)
  })
  it('should store some content', async () => {
    expect(result2.stored).toBeGreaterThan(0)
    expect(result2.stored).toEqual(3)
  })

  const next = await network1.forwardAccountTrieOffer(path, proof, blockHash)
  const expected = AccountTrieNodeRetrieval.serialize({ node: proof[proof.length - 2] })
  const requested = await network1.sendFindContent(node2.discv5.enr.nodeId, next.contentKey)
  it('should request individual node from peer', () => {
    expect(requested).toBeDefined()
    expect(requested!['content'].instanceOf(Uint8Array))
    assert.deepEqual(requested!['content'], expected, 'retrieved value is correct')
  })
})

describe('getAccount via network', async () => {
  const protoBufs = [
    '0x0a27002508021221024776a66a32c732ff71d6477fab2beb1e1b303ae157c3b5d95789aa52b1740b82122508021221024776a66a32c732ff71d6477fab2beb1e1b303ae157c3b5d95789aa52b1740b821a240802122091b5cbbc2bf054f913c3a344bf8ce6d19373142854eabeeffb5a3f159c44e610',
    '0x0a2700250802122103d2a342da6a4fe1598f83df70bfcf9047e24eb7804799067c680870989e4ff0b412250802122103d2a342da6a4fe1598f83df70bfcf9047e24eb7804799067c680870989e4ff0b41a24080212202a63200954ac3c187131b79d39f16ef601d83d57f882b58acdad0dd346c06258',
    '0x0a2700250802122103879ca6d3b9e51e746f90704496e3c36a0c473e0ec734dfa52bd8be50c7c4044c12250802122103879ca6d3b9e51e746f90704496e3c36a0c473e0ec734dfa52bd8be50c7c4044c1a24080212204d9ce45403c77746d795f6f01bafd81b5e4dfd9f7bfd6bd2edd9a06f32d86e36',
    '0x0a270025080212210297b980a75593bc2c9f3ffc0d393a240b8d7b26465bcbc0b8a488f01202b962cd1225080212210297b980a75593bc2c9f3ffc0d393a240b8d7b26465bcbc0b8a488f01202b962cd1a24080212204c768f46d83b047fe5f7521f77b2feb3f182df96a39543f9b9b09f3c7e1a4e29',
    '0x0a2700250802122102a80d91fa0da65157cf3e7d44cf5a070c01f5a37f5c77536c421813dbe3fe874a12250802122102a80d91fa0da65157cf3e7d44cf5a070c01f5a37f5c77536c421813dbe3fe874a1a24080212203676d8bd61041188b449f9517a51837d415f01caa10f81c7bd22febca0eadf3b',
    '0x0a27002508021221030bc06a165852567cd1f47728741e44aa8c1445e2f64176866a42f658bb9f13fe122508021221030bc06a165852567cd1f47728741e44aa8c1445e2f64176866a42f658bb9f13fe1a24080212205be348796815dabfd5c89d2d4dba943f3314a59a47e4d21b2a1a1b66fff330da',
  ]
  const clients = await Promise.all(
    protoBufs.map(async (protobuf, i) => {
      const pk = keys.privateKeyFromProtobuf(hexToBytes(protobuf).slice(-36))
      const enr = SignableENR.createFromPrivateKey(pk)
      const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/${3022 + i}`)
      enr.setLocationMultiaddr(initMa)
      const node = await PortalNetwork.create({
        transport: TransportLayer.NODE,
        supportedNetworks: [{ networkId: NetworkId.StateNetwork }],
        config: {
          enr,
          bindAddrs: {
            ip4: initMa,
          },
          privateKey: pk,
        },
      })
      await node.start()
      return node
    }),
  )
  const networks = clients.map(
    (client) => client.networks.get(NetworkId.StateNetwork) as StateNetwork,
  )

  for (const [idx, network] of networks.entries()) {
    network.nodeRadius = 2n ** 255n - 1n
    const pong1 = await network.sendPing(clients[(idx + 1) % clients.length].discv5.enr.toENR())
    const pong2 = await network.sendPing(clients[(idx + 2) % clients.length].discv5.enr.toENR())
    it(`client ${idx} connects to network`, async () => {
      expect(pong1).toBeDefined()
      expect(pong2).toBeDefined()
      let storedEnr = networks[(idx + 1) % clients.length].routingTable.getWithPending(
        network.enr.nodeId,
      )
      assert.equal(
        storedEnr?.value.nodeId,
        network.enr.nodeId,
        'found another node that supports state network',
      )
      storedEnr = networks[(idx + 2) % clients.length].routingTable.getWithPending(
        network.enr.nodeId,
      )
      assert.equal(
        storedEnr?.value.nodeId,
        network.enr.nodeId,
        'found another node that supports state network',
      )
    })
  }
  await new Promise((r) => setTimeout(r, 1000))
  await networks[0].receiveAccountTrieNodeOffer(contentKey, content)
  await networks[1].receiveAccountTrieNodeOffer(contentKey, content)
  await networks[2].receiveAccountTrieNodeOffer(contentKey, content)
  await networks[3].receiveAccountTrieNodeOffer(contentKey, content)
  await networks[4].receiveAccountTrieNodeOffer(contentKey, content)
  await networks[5].receiveAccountTrieNodeOffer(contentKey, content)
  await new Promise((r) => setTimeout(r, 1000))
  const storedInNodes = await Promise.all(
    networks.map(async (network) => {
      const stored: Set<string> = new Set()
      for await (const key of network.db.db.keys()) {
        stored.add(key)
      }
      return stored
    }),
  )
  const storedValues = storedInNodes.map((set) => [...set.values()])
  const uniqueStored = Array.from(new Set(storedValues.flat()))
  it('should distribute all nodes', () => {
    expect(uniqueStored.length).toEqual(5)
  })
  for (const [idx, keys] of storedInNodes.entries()) {
    it(`client ${idx} should store ${keys.size} trie nodes`, () => {
      expect(keys.size).toBeLessThan(5)
    })
  }
  const testClient = networks[4]

  const testAddress = '0x1a2694ec07cf5e4d68ba40f3e7a14c53f3038c6e'
  const stateRoot = trie['hash'](deserialized.proof[0])
  const found = await testClient.getAccount(testAddress, stateRoot, true)
  if (found === undefined) {
    it('failed', () => {
      assert.fail('failed to find account data')
    })
    return
  }
  const foundAccount = Account.fromRlpSerializedAccount(found)
  it('should find account data', async () => {
    assert.deepEqual(foundAccount.balance, BigInt('0x3636cd06e2db3a8000'), 'account data found')
  })

  const temp = [...testClient.stateDB.db.tempKeys()]
  const perm: string[] = await testClient.stateDB.keys()
  console.log({ temp, perm })
  it(`should have all ${uniqueStored.length} nodes in temp or permanent db`, async () => {
    expect(temp.length + perm.length).toEqual(uniqueStored.length)
    for (const key of temp) {
      expect(perm.includes(key)).toBeFalsy()
    }
  })
})
