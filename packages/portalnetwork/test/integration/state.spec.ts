import { describe, it, assert } from 'vitest'
import {
  AccountTrieProofType,
  NetworkId,
  PortalNetwork,
  StateNetwork,
  StateNetworkContentType,
  TransportLayer,
  getStateNetworkContentKey,
  toHexString,
} from '../../src/index.js'
import { multiaddr } from '@multiformats/multiaddr'
import { SignableENR } from '@chainsafe/discv5'
import { createFromProtobuf } from '@libp2p/peer-id-factory'
import { Account, Address, hexToBytes, randomBytes } from '@ethereumjs/util'
import { Trie } from '@ethereumjs/trie'

const privateKeys = [
  '0x0a2700250802122102273097673a2948af93317235d2f02ad9cf3b79a34eeb37720c5f19e09f11783c12250802122102273097673a2948af93317235d2f02ad9cf3b79a34eeb37720c5f19e09f11783c1a2408021220aae0fff4ac28fdcdf14ee8ecb591c7f1bc78651206d86afe16479a63d9cb73bd',
  '0x0a27002508021221039909a8a7e81dbdc867480f0eeb7468189d1e7a1dd7ee8a13ee486c8cbd743764122508021221039909a8a7e81dbdc867480f0eeb7468189d1e7a1dd7ee8a13ee486c8cbd7437641a2408021220c6eb3ae347433e8cfe7a0a195cc17fc8afcd478b9fb74be56d13bccc67813130',
]
const id1 = await createFromProtobuf(hexToBytes(privateKeys[0]))
const enr1 = SignableENR.createFromPeerId(id1)
const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/0`)
enr1.setLocationMultiaddr(initMa)
describe('State Network wire spec tests', () => {
  it('should find another node', async () => {
    const id1 = await createFromProtobuf(hexToBytes(privateKeys[0]))
    const enr1 = SignableENR.createFromPeerId(id1)
    const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/3020`)
    enr1.setLocationMultiaddr(initMa)
    const id2 = await createFromProtobuf(hexToBytes(privateKeys[1]))
    const enr2 = SignableENR.createFromPeerId(id2)
    const initMa2: any = multiaddr(`/ip4/127.0.0.1/udp/3021`)
    enr2.setLocationMultiaddr(initMa2)
    const node1 = await PortalNetwork.create({
      transport: TransportLayer.NODE,
      supportedNetworks: [NetworkId.StateNetwork],
      config: {
        enr: enr1,
        bindAddrs: {
          ip4: initMa,
        },
        peerId: id1,
      },
    })
    const node2 = await PortalNetwork.create({
      transport: TransportLayer.NODE,
      supportedNetworks: [NetworkId.StateNetwork],
      config: {
        enr: enr2,
        bindAddrs: {
          ip4: initMa2,
        },
        peerId: id2,
      },
    })

    await node1.start()
    await node2.start()
    const network1 = node1.networks.get(NetworkId.StateNetwork) as StateNetwork
    const network2 = node2.networks.get(NetworkId.StateNetwork) as StateNetwork
    await network1!.sendPing(network2?.enr!.toENR())
    const enr = network2.routingTable.getWithPending(node1.discv5.enr.nodeId)
    assert.equal(
      enr?.value.nodeId,
      node1.discv5.enr.nodeId,
      'found another node that supports state network',
    )
  })
  it('should find content from another node', async () => {
    const id1 = await createFromProtobuf(hexToBytes(privateKeys[0]))
    const enr1 = SignableENR.createFromPeerId(id1)
    const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/3002`)
    enr1.setLocationMultiaddr(initMa)
    const id2 = await createFromProtobuf(hexToBytes(privateKeys[1]))
    const enr2 = SignableENR.createFromPeerId(id2)
    const initMa2: any = multiaddr(`/ip4/127.0.0.1/udp/3003`)
    enr2.setLocationMultiaddr(initMa2)
    const node1 = await PortalNetwork.create({
      transport: TransportLayer.NODE,
      supportedNetworks: [NetworkId.StateNetwork],
      config: {
        enr: enr1,
        bindAddrs: {
          ip4: initMa,
        },
        peerId: id1,
      },
    })
    const node2 = await PortalNetwork.create({
      transport: TransportLayer.NODE,
      supportedNetworks: [NetworkId.StateNetwork],
      config: {
        enr: enr2,
        bindAddrs: {
          ip4: initMa2,
        },
        peerId: id2,
      },
    })

    await node1.start()
    await node2.start()
    const network1 = node1.networks.get(NetworkId.StateNetwork) as StateNetwork
    const network2 = node2.networks.get(NetworkId.StateNetwork) as StateNetwork
    await network1!.sendPing(network2?.enr!.toENR())
    const pk = randomBytes(32)
    const address = Address.fromPrivateKey(pk)
    const account = Account.fromAccountData({ balance: 0n, nonce: 1n })

    const trie = new Trie({ useKeyHashing: true })
    await trie.put(address.toBytes(), account.serialize())

    const proof = await trie.createProof(address.toBytes())

    const content = AccountTrieProofType.serialize({
      balance: account!.balance,
      nonce: account!.nonce,
      codeHash: account!.codeHash,
      storageRoot: account!.storageRoot,
      witnesses: proof,
    })
    await network1.stateDB.inputAccountTrieProof(address.toBytes(), trie.root(), content)
    const contentKey = getStateNetworkContentKey({
      address: address,
      contentType: StateNetworkContentType.AccountTrieProof,
      stateRoot: trie.root(),
    })
    await network2.sendFindContent(node1.discv5.enr.nodeId, contentKey)
    const gotAccount = await network2.stateDB.getAccount(
      address.toString(),
      toHexString(trie.root()),
    )
    assert.equal(gotAccount!.balance, account.balance, 'found account content on devnet')
  })
})
