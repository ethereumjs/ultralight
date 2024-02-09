import { SignableENR } from '@chainsafe/discv5'
// import { RLP } from '@ethereumjs/rlp'
// import { Trie } from '@ethereumjs/trie'
import { hexToBytes } from '@ethereumjs/util'
import { createFromProtobuf } from '@libp2p/peer-id-factory'
import { multiaddr } from '@multiformats/multiaddr'
// import { keccak256 } from 'ethereum-cryptography/keccak.js'
import { describe } from 'vitest'

// import {
//   AccountTrieProofType,
//   ContractByteCodeType,
//   ContractStorageTrieProofType,
//   NetworkId,
//   PortalNetwork,
//   StateNetworkContentType,
//   TransportLayer,
//   fromHexString,
//   getStateNetworkContentKey,
//   toHexString,
// } from '../../src/index.js'

// import type { StateNetwork } from '../../src/index.js'

const privateKeys = [
  '0x0a2700250802122102273097673a2948af93317235d2f02ad9cf3b79a34eeb37720c5f19e09f11783c12250802122102273097673a2948af93317235d2f02ad9cf3b79a34eeb37720c5f19e09f11783c1a2408021220aae0fff4ac28fdcdf14ee8ecb591c7f1bc78651206d86afe16479a63d9cb73bd',
  '0x0a27002508021221039909a8a7e81dbdc867480f0eeb7468189d1e7a1dd7ee8a13ee486c8cbd743764122508021221039909a8a7e81dbdc867480f0eeb7468189d1e7a1dd7ee8a13ee486c8cbd7437641a2408021220c6eb3ae347433e8cfe7a0a195cc17fc8afcd478b9fb74be56d13bccc67813130',
]
const id1 = await createFromProtobuf(hexToBytes(privateKeys[0]))
const enr1 = SignableENR.createFromPeerId(id1)
const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/0`)
enr1.setLocationMultiaddr(initMa)
describe.skip('State Network wire spec tests', () => {
  //   it('should find another node', async () => {
  //     const id1 = await createFromProtobuf(hexToBytes(privateKeys[0]))
  //     const enr1 = SignableENR.createFromPeerId(id1)
  //     const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/3020`)
  //     enr1.setLocationMultiaddr(initMa)
  //     const id2 = await createFromProtobuf(hexToBytes(privateKeys[1]))
  //     const enr2 = SignableENR.createFromPeerId(id2)
  //     const initMa2: any = multiaddr(`/ip4/127.0.0.1/udp/3021`)
  //     enr2.setLocationMultiaddr(initMa2)
  //     const node1 = await PortalNetwork.create({
  //       transport: TransportLayer.NODE,
  //       supportedNetworks: [NetworkId.StateNetwork],
  //       config: {
  //         enr: enr1,
  //         bindAddrs: {
  //           ip4: initMa,
  //         },
  //         peerId: id1,
  //       },
  //     })
  //     const node2 = await PortalNetwork.create({
  //       transport: TransportLayer.NODE,
  //       supportedNetworks: [NetworkId.StateNetwork],
  //       config: {
  //         enr: enr2,
  //         bindAddrs: {
  //           ip4: initMa2,
  //         },
  //         peerId: id2,
  //       },
  //     })
  //     await node1.start()
  //     await node2.start()
  //     const network1 = node1.networks.get(NetworkId.StateNetwork) as StateNetwork
  //     const network2 = node2.networks.get(NetworkId.StateNetwork) as StateNetwork
  //     await network1!.sendPing(network2?.enr!.toENR())
  //     const enr = network2.routingTable.getWithPending(node1.discv5.enr.nodeId)
  //     assert.equal(
  //       enr?.value.nodeId,
  //       node1.discv5.enr.nodeId,
  //       'found another node that supports state network',
  //     )
  //   })
  //   it('should find content from another node', async () => {
  //     const id1 = await createFromProtobuf(hexToBytes(privateKeys[0]))
  //     const enr1 = SignableENR.createFromPeerId(id1)
  //     const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/3002`)
  //     enr1.setLocationMultiaddr(initMa)
  //     const id2 = await createFromProtobuf(hexToBytes(privateKeys[1]))
  //     const enr2 = SignableENR.createFromPeerId(id2)
  //     const initMa2: any = multiaddr(`/ip4/127.0.0.1/udp/3003`)
  //     enr2.setLocationMultiaddr(initMa2)
  //     const node1 = await PortalNetwork.create({
  //       transport: TransportLayer.NODE,
  //       supportedNetworks: [NetworkId.StateNetwork],
  //       config: {
  //         enr: enr1,
  //         bindAddrs: {
  //           ip4: initMa,
  //         },
  //         peerId: id1,
  //       },
  //     })
  //     const node2 = await PortalNetwork.create({
  //       transport: TransportLayer.NODE,
  //       supportedNetworks: [NetworkId.StateNetwork],
  //       config: {
  //         enr: enr2,
  //         bindAddrs: {
  //           ip4: initMa2,
  //         },
  //         peerId: id2,
  //       },
  //     })
  //     await node1.start()
  //     await node2.start()
  //     const network1 = node1.networks.get(NetworkId.StateNetwork) as StateNetwork
  //     const network2 = node2.networks.get(NetworkId.StateNetwork) as StateNetwork
  //     await network1!.sendPing(network2?.enr!.toENR())
  //     const pk = randomBytes(32)
  //     const address = Address.fromPrivateKey(pk)
  //     const account = Account.fromAccountData({ balance: 0n, nonce: 1n })
  //     const trie = new Trie({ useKeyHashing: true })
  //     await trie.put(address.toBytes(), account.serialize())
  //     const proof = await trie.createProof(address.toBytes())
  //     const content = AccountTrieProofType.serialize({
  //       witnesses: proof,
  //     })
  //     await network1.stateDB.inputAccountTrieProof(address.toBytes(), trie.root(), content)
  //     const contentKey = getStateNetworkContentKey({
  //       address,
  //       contentType: StateNetworkContentType.AccountTrieProof,
  //       stateRoot: trie.root(),
  //     })
  //     await network2.sendFindContent(node1.discv5.enr.nodeId, contentKey)
  //     const gotAccount = await network2.stateDB.getAccount(
  //       address.toString(),
  //       toHexString(trie.root()),
  //     )
  //     assert.equal(gotAccount!.balance, account.balance, 'found account content on devnet')
  //   })
  // })
  // describe('recursive find content', () => {
  //   it('should recursively find an account from another node', async () => {
  //     const id1 = await createFromProtobuf(hexToBytes(privateKeys[0]))
  //     const enr1 = SignableENR.createFromPeerId(id1)
  //     const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/3042`)
  //     enr1.setLocationMultiaddr(initMa)
  //     const id2 = await createFromProtobuf(hexToBytes(privateKeys[1]))
  //     const enr2 = SignableENR.createFromPeerId(id2)
  //     const initMa2: any = multiaddr(`/ip4/127.0.0.1/udp/3043`)
  //     enr2.setLocationMultiaddr(initMa2)
  //     const node1 = await PortalNetwork.create({
  //       transport: TransportLayer.NODE,
  //       supportedNetworks: [NetworkId.StateNetwork],
  //       config: {
  //         enr: enr1,
  //         bindAddrs: {
  //           ip4: initMa,
  //         },
  //         peerId: id1,
  //       },
  //     })
  //     const node2 = await PortalNetwork.create({
  //       transport: TransportLayer.NODE,
  //       supportedNetworks: [NetworkId.StateNetwork],
  //       config: {
  //         enr: enr2,
  //         bindAddrs: {
  //           ip4: initMa2,
  //         },
  //         peerId: id2,
  //       },
  //     })
  //     await node1.start()
  //     await node2.start()
  //     const network1 = node1.networks.get(NetworkId.StateNetwork) as StateNetwork
  //     const network2 = node2.networks.get(NetworkId.StateNetwork) as StateNetwork
  //     const pk = randomBytes(32)
  //     const address = Address.fromPrivateKey(pk)
  //     const account = Account.fromAccountData({ balance: 0n, nonce: 1n })
  //     const trie = new Trie({ useKeyHashing: true })
  //     await trie.put(address.toBytes(), account.serialize())
  //     const proof = await trie.createProof(address.toBytes())
  //     const content = AccountTrieProofType.serialize({
  //       witnesses: proof,
  //     })
  //     await network1.stateDB.inputAccountTrieProof(address.toBytes(), trie.root(), content)
  //     await network1!.sendPing(network2?.enr!.toENR())
  //     const res = await network2.getAccount(address.toString(), toHexString(trie.root()))
  //     assertType<Account>(res)
  //     assert.equal(res.nonce, 1n, 'retrieved account via recursive find content')
  //   })
  //   it('should recursively find bytecode from another node', async () => {
  //     const id1 = await createFromProtobuf(hexToBytes(privateKeys[0]))
  //     const enr1 = SignableENR.createFromPeerId(id1)
  //     const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/3044`)
  //     enr1.setLocationMultiaddr(initMa)
  //     const id2 = await createFromProtobuf(hexToBytes(privateKeys[1]))
  //     const enr2 = SignableENR.createFromPeerId(id2)
  //     const initMa2: any = multiaddr(`/ip4/127.0.0.1/udp/3045`)
  //     enr2.setLocationMultiaddr(initMa2)
  //     const node1 = await PortalNetwork.create({
  //       transport: TransportLayer.NODE,
  //       supportedNetworks: [NetworkId.StateNetwork],
  //       config: {
  //         enr: enr1,
  //         bindAddrs: {
  //           ip4: initMa,
  //         },
  //         peerId: id1,
  //       },
  //     })
  //     const node2 = await PortalNetwork.create({
  //       transport: TransportLayer.NODE,
  //       supportedNetworks: [NetworkId.StateNetwork],
  //       config: {
  //         enr: enr2,
  //         bindAddrs: {
  //           ip4: initMa2,
  //         },
  //         peerId: id2,
  //       },
  //     })
  //     await node1.start()
  //     await node2.start()
  //     const network1 = node1.networks.get(NetworkId.StateNetwork) as StateNetwork
  //     const network2 = node2.networks.get(NetworkId.StateNetwork) as StateNetwork
  //     const greeterBytecode =
  //       '0x608060405234801561000f575f80fd5b5060043610610034575f3560e01c80638da5cb5b14610038578063cfae321714610056575b5f80fd5b610040610074565b60405161004d9190610118565b60405180910390f35b61005e61009c565b60405161006b91906101bb565b60405180910390f35b5f60015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff16905090565b60606040518060400160405280600581526020017f68656c6c6f000000000000000000000000000000000000000000000000000000815250905090565b5f73ffffffffffffffffffffffffffffffffffffffff82169050919050565b5f610102826100d9565b9050919050565b610112816100f8565b82525050565b5f60208201905061012b5f830184610109565b92915050565b5f81519050919050565b5f82825260208201905092915050565b5f5b8381101561016857808201518184015260208101905061014d565b5f8484015250505050565b5f601f19601f8301169050919050565b5f61018d82610131565b610197818561013b565b93506101a781856020860161014b565b6101b081610173565b840191505092915050565b5f6020820190508181035f8301526101d38184610183565b90509291505056fea2646970667358221220945519e237b301b5baf64c20c2a39b6a8b300541470b28b0e6cfbc1568dc6f3364736f6c63430008160033'
  //     const byteCode = fromHexString(greeterBytecode)
  //     const pk = randomBytes(32)
  //     const address = Address.fromPrivateKey(pk)
  //     const codehash = keccak256(byteCode)
  //     const account = Account.fromAccountData({ balance: 0n, nonce: 1n, codeHash: codehash })
  //     const trie = new Trie({ useKeyHashing: true })
  //     await trie.put(address.toBytes(), account.serialize())
  //     const proof = await trie.createProof(address.toBytes())
  //     const content = AccountTrieProofType.serialize({
  //       witnesses: proof,
  //     })
  //     await network1.stateDB.inputAccountTrieProof(address.toBytes(), trie.root(), content)
  //     const byteCodeContent = ContractByteCodeType.serialize(byteCode)
  //     await network1.stateDB.inputContractByteCode(address.toBytes(), codehash, byteCodeContent)
  //     await network1.stateDB.inputAccountTrieProof(address.toBytes(), trie.root(), content)
  //     await network1!.sendPing(network2?.enr!.toENR())
  //     const res = await network2.getBytecode(toHexString(codehash), address.toString())
  //     assertType<Uint8Array>(res)
  //     assert.deepEqual(res, byteCode, 'retrieved bytecode via recursive find content')
  //   })
  //   it('should recursively find contract storage from another node', async () => {
  //     const cstp = (await import('../networks/state/content.json')).CSTP
  //     const id1 = await createFromProtobuf(hexToBytes(privateKeys[0]))
  //     const enr1 = SignableENR.createFromPeerId(id1)
  //     const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/3046`)
  //     enr1.setLocationMultiaddr(initMa)
  //     const id2 = await createFromProtobuf(hexToBytes(privateKeys[1]))
  //     const enr2 = SignableENR.createFromPeerId(id2)
  //     const initMa2: any = multiaddr(`/ip4/127.0.0.1/udp/3047`)
  //     enr2.setLocationMultiaddr(initMa2)
  //     const node1 = await PortalNetwork.create({
  //       transport: TransportLayer.NODE,
  //       supportedNetworks: [NetworkId.StateNetwork],
  //       config: {
  //         enr: enr1,
  //         bindAddrs: {
  //           ip4: initMa,
  //         },
  //         peerId: id1,
  //       },
  //     })
  //     const node2 = await PortalNetwork.create({
  //       transport: TransportLayer.NODE,
  //       supportedNetworks: [NetworkId.StateNetwork],
  //       config: {
  //         enr: enr2,
  //         bindAddrs: {
  //           ip4: initMa2,
  //         },
  //         peerId: id2,
  //       },
  //     })
  //     await node1.start()
  //     await node2.start()
  //     const network1 = node1.networks.get(NetworkId.StateNetwork) as StateNetwork
  //     const network2 = node2.networks.get(NetworkId.StateNetwork) as StateNetwork
  //     const storageTrie = new Trie({ useKeyHashing: true })
  //     const storageTrieProof = ContractStorageTrieProofType.deserialize(fromHexString(cstp.content))
  //     await storageTrie.fromProof(storageTrieProof.witnesses)
  //     const stored = await storageTrie.get(fromHexString(cstp.slot))
  //     assert.deepEqual(RLP.decode(stored), Uint8Array.from(cstp.data), 'stored value in storage trie')
  //     const pk = randomBytes(32)
  //     const address = Address.fromPrivateKey(pk)
  //     const account = Account.fromAccountData({
  //       balance: 0n,
  //       nonce: 1n,
  //       storageRoot: storageTrie.root(),
  //     })
  //     const trie = new Trie({ useKeyHashing: true })
  //     await trie.put(address.toBytes(), account.serialize())
  //     const storedAccount = await trie.get(address.bytes)
  //     assert.deepEqual(storedAccount, account.serialize(), 'stored account in account trie')
  //     const proof = await trie.createProof(address.toBytes())
  //     const storageProof = await storageTrie.createProof(fromHexString(cstp.slot))
  //     const content = AccountTrieProofType.serialize({
  //       witnesses: proof,
  //     })
  //     const storageContent = ContractStorageTrieProofType.serialize({
  //       witnesses: storageProof,
  //     })
  //     await network1.stateDB.inputAccountTrieProof(address.toBytes(), trie.root(), content)
  //     await network1.stateDB.inputContractStorageTrieProof(
  //       address.bytes,
  //       BigInt(cstp.slot),
  //       trie.root(),
  //       storageContent,
  //     )
  //     await network1!.sendPing(network2?.enr!.toENR())
  //     const res = await network2.getContractStorage(
  //       address.toString(),
  //       BigInt(cstp.slot),
  //       toHexString(trie.root()),
  //     )
  //     assert.isDefined(res)
  //     assert.equal(
  //       toHexString(RLP.decode(res!) as Uint8Array),
  //       cstp.value,
  //       'retrieved contract storage slot via recursive find content',
  //     )
  //   }, 5000)
})
