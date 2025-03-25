// import { SignableENR } from '@chainsafe/discv5/enr'
// import { hexToBytes, bytesToHex } from '@chainsafe/ssz'
// import { EVM } from '@ethereumjs/evm'
// import { Trie } from '@ethereumjs/mpt'
// import {
//   Account,
//   Address,
//   bigIntToBytes,
//   bytesToInt,
//   bytesToUtf8,
//   equalsBytes,
//   hexToBytes,
//   randomBytes,
//   setLengthLeft,
//   utf8ToBytes,
// } from '@ethereumjs/util'
// import { multiaddr } from '@multiformats/multiaddr'
// import { keccak256 } from 'ethereum-cryptography/keccak.js'
import { describe } from 'vitest'

// import { PortalNetwork } from '../../../src/client/client.js'
// import { TransportLayer } from '../../../src/client/types.js'
// import { UltralightStateManager } from '../../../src/networks/state/stateManager.js'
// import {
//   AccountTrieProofType,
//   ContractByteCodeType,
//   ContractStorageTrieProofType,
// } from '../../../src/networks/state/types.js'
// import { NetworkId } from '../../../src/networks/types.js'

// import type { StateNetwork } from '../../../src/networks/state/state.js'

// const privateKeys = [
//   '0x0a2700250802122102273097673a2948af93317235d2f02ad9cf3b79a34eeb37720c5f19e09f11783c12250802122102273097673a2948af93317235d2f02ad9cf3b79a34eeb37720c5f19e09f11783c1a2408021220aae0fff4ac28fdcdf14ee8ecb591c7f1bc78651206d86afe16479a63d9cb73bd',
// ]
// const id1 = await createFromProtobuf(hexToBytes(privateKeys[0]))
// const enr1 = SignableENR.createFromPeerId(id1)
// const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/0`)
// enr1.setLocationMultiaddr(initMa)
describe.skip('UltralightStateManager', () => {
  // it('should get account from stateDB when it exists', async () => {
  //   const node = await PortalNetwork.create({
  //     transport: TransportLayer.NODE,
  //     supportedNetworks: [NetworkId.StateNetwork],
  //     config: {
  //       enr: enr1,
  //       bindAddrs: {
  //         ip4: initMa,
  //       },
  //       peerId: id1,
  //     },
  //   })
  //   const network = node.networks.get(NetworkId.StateNetwork) as StateNetwork
  //   const usm = new UltralightStateManager(network)
  //   const pk = randomBytes(32)
  //   const address = Address.fromPrivateKey(pk)
  //   const account = Account.fromAccountData({ balance: 0n, nonce: 1n })
  //   const trie = new Trie({ useKeyHashing: true })
  //   await trie.put(address.toBytes(), account.serialize())
  //   const proof = await trie.createProof(address.toBytes())
  //   const content = AccountTrieProofType.serialize({
  //     witnesses: proof,
  //   })
  //   await network.stateDB.inputAccountTrieProof(address.toBytes(), trie.root(), content)
  //   await usm.setStateRoot(trie.root())
  //   const gotAccount = await usm.getAccount(address)
  //   assert.equal(gotAccount?.balance, account.balance, 'retrieved account from state manager')
  // })
  // it('should be able to retrieve bytecode necessary to execute evm.runCall', async () => {
  //   // Greeter contract Solidity code
  //   // pragma solidity >= 0.8.0;
  //   // // SPDX-License-Identifier: MIT
  //   // contract Greeter {
  //   //   string private _greeting = "Hello, World!";
  //   //   address private _owner;
  //   //   function greet() external pure returns(string memory) {
  //   //     return 'hello';
  //   //   }
  //   //   function owner() public view returns(address) {
  //   //     return _owner;
  //   //   }
  //   // }
  //   const greeterBytecode =
  //     '0x608060405234801561000f575f80fd5b5060043610610034575f3560e01c80638da5cb5b14610038578063cfae321714610056575b5f80fd5b610040610074565b60405161004d9190610118565b60405180910390f35b61005e61009c565b60405161006b91906101bb565b60405180910390f35b5f60015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff16905090565b60606040518060400160405280600581526020017f68656c6c6f000000000000000000000000000000000000000000000000000000815250905090565b5f73ffffffffffffffffffffffffffffffffffffffff82169050919050565b5f610102826100d9565b9050919050565b610112816100f8565b82525050565b5f60208201905061012b5f830184610109565b92915050565b5f81519050919050565b5f82825260208201905092915050565b5f5b8381101561016857808201518184015260208101905061014d565b5f8484015250505050565b5f601f19601f8301169050919050565b5f61018d82610131565b610197818561013b565b93506101a781856020860161014b565b6101b081610173565b840191505092915050565b5f6020820190508181035f8301526101d38184610183565b90509291505056fea2646970667358221220945519e237b301b5baf64c20c2a39b6a8b300541470b28b0e6cfbc1568dc6f3364736f6c63430008160033'
  //   const byteCode = hexToBytes(greeterBytecode)
  //   const node = await PortalNetwork.create({
  //     transport: TransportLayer.NODE,
  //     supportedNetworks: [NetworkId.StateNetwork],
  //     config: {
  //       enr: enr1,
  //       bindAddrs: {
  //         ip4: initMa,
  //       },
  //       peerId: id1,
  //     },
  //   })
  //   const network = node.networks.get(NetworkId.StateNetwork) as StateNetwork
  //   const usm = new UltralightStateManager(network)
  //   const pk = randomBytes(32)
  //   const address = Address.fromPrivateKey(pk)
  //   const codehash = keccak256(byteCode)
  //   const account = Account.fromAccountData({ balance: 0n, nonce: 1n, codeHash: codehash })
  //   const zero = Address.zero()
  //   const zeroAccount = new Account()
  //   const trie = new Trie({ useKeyHashing: true })
  //   await trie.put(address.toBytes(), account.serialize())
  //   await trie.put(zero.bytes, zeroAccount.serialize())
  //   const proof = await trie.createProof(address.toBytes())
  //   const zeroProof = await trie.createProof(zero.bytes)
  //   const content = AccountTrieProofType.serialize({
  //     witnesses: proof,
  //   })
  //   const zeroContent = AccountTrieProofType.serialize({
  //     witnesses: zeroProof,
  //   })
  //   await network.stateDB.inputAccountTrieProof(address.toBytes(), trie.root(), content)
  //   await network.stateDB.inputAccountTrieProof(zero.bytes, trie.root(), zeroContent)
  //   const byteCodeContent = ContractByteCodeType.serialize(byteCode)
  //   await network.stateDB.inputContractByteCode(address.toBytes(), codehash, byteCodeContent)
  //   await usm.setStateRoot(trie.root())
  //   const gotAccount = await usm.getAccount(address)
  //   assert.equal(gotAccount?.balance, account.balance, 'retrieved account from state manager')
  //   const gotCode = await usm.getContractCode(address)
  //   assert.deepEqual(gotCode, byteCode, 'retrieved contract code from state network')
  //   const greeterInput = '0xcfae3217'
  //   const evm = new EVM({ stateManager: usm })
  //   const res = (await evm.runCall({ data: hexToBytes(greeterInput), to: address })).execResult
  //     .returnValue
  //   // Decode offset in `returnValue` for start of Solidity return value
  //   const offset = bytesToInt(res.slice(0, 32))
  //   // First 32 bytes of return value are length of returned value
  //   const length = bytesToInt(res.slice(offset, offset + 32))
  //   // Compute the starting position of the returned value
  //   const startPosition = offset + 32
  //   // Compuite the ending position of the returned value
  //   const endPosition = startPosition + length
  //   const returnedValue = bytesToUtf8(res.slice(startPosition, endPosition))
  //   assert.equal(
  //     returnedValue,
  //     'hello',
  //     'got expected greeting from contract stored in Ultralight State Manager',
  //   )
  // })
  // it('should retrieve contract storage slot value from state manager', async () => {
  //   const cstp = (await import('./content.json')).CSTP
  //   const node = await PortalNetwork.create({
  //     transport: TransportLayer.NODE,
  //     supportedNetworks: [NetworkId.StateNetwork],
  //     config: {
  //       enr: enr1,
  //       bindAddrs: {
  //         ip4: initMa,
  //       },
  //       peerId: id1,
  //     },
  //   })
  //   const network = node.networks.get(NetworkId.StateNetwork) as StateNetwork
  //   const usm = new UltralightStateManager(network)
  //   const storageTrie = new Trie({ useKeyHashing: true })
  //   await storageTrie.put(hexToBytes(cstp.slot), hexToBytes(cstp.value))
  //   const pk = randomBytes(32)
  //   const address = Address.fromPrivateKey(pk)
  //   const account = Account.fromAccountData({
  //     balance: 0n,
  //     nonce: 1n,
  //     storageRoot: storageTrie.root(),
  //   })
  //   const trie = new Trie({ useKeyHashing: true })
  //   await trie.put(address.toBytes(), account.serialize())
  //   const proof = await trie.createProof(address.toBytes())
  //   const storageProof = await storageTrie.createProof(hexToBytes(cstp.slot))
  //   const content = AccountTrieProofType.serialize({
  //     witnesses: proof,
  //   })
  //   const storageContent = ContractStorageTrieProofType.serialize({
  //     witnesses: storageProof,
  //   })
  //   await network.stateDB.inputAccountTrieProof(address.toBytes(), trie.root(), content)
  //   await network.stateDB.inputContractStorageTrieProof(
  //     address.bytes,
  //     BigInt(cstp.slot),
  //     trie.root(),
  //     storageContent,
  //   )
  //   await usm.setStateRoot(trie.root())
  //   const res = await usm.getContractStorage(address, hexToBytes(cstp.slot))
  //   assert.equal(
  //     bytesToHex(res),
  //     cstp.value,
  //     'successfully retrieved storage slot with state manager',
  //   )
  // })
  // it('should store/modify bytecode, storage, and accounts in the state manager cache', async () => {
  //   const node = await PortalNetwork.create({
  //     transport: TransportLayer.NODE,
  //     supportedNetworks: [NetworkId.StateNetwork],
  //     config: {
  //       enr: enr1,
  //       bindAddrs: {
  //         ip4: initMa,
  //       },
  //       peerId: id1,
  //     },
  //   })
  //   const network = node.networks.get(NetworkId.StateNetwork) as StateNetwork
  //   const usm = new UltralightStateManager(network)
  //   const vitalikDotEth = Address.fromString('0xd8da6bf26964af9d7eed9e03e53415d37aa96045')
  //   let account = await usm.getAccount(vitalikDotEth)
  //   assert.equal(account, undefined)
  //   account = new Account(1n)
  //   await usm.putAccount(vitalikDotEth, account)
  //   account = undefined
  //   account = await usm.getAccount(vitalikDotEth)
  //   assert.equal(account?.nonce, 1n, 'able to retrieve account stored in cache')
  //   await usm.modifyAccountFields(vitalikDotEth, { nonce: 39n })
  //   assert.equal(
  //     (await usm.getAccount(vitalikDotEth))?.nonce,
  //     39n,
  //     'modified account fields successfully',
  //   )
  //   await usm.checkpoint()
  //   await usm.deleteAccount(vitalikDotEth)
  //   assert.equal(
  //     await usm.getAccount(vitalikDotEth),
  //     undefined,
  //     'account should not exist after being deleted',
  //   )
  //   await usm.revert()
  //   assert.ok(
  //     (await usm.getAccount(vitalikDotEth)) !== undefined,
  //     'account deleted since last checkpoint should exist after revert called',
  //   )
  //   await usm.putContractStorage(
  //     vitalikDotEth,
  //     setLengthLeft(bigIntToBytes(2n), 32),
  //     utf8ToBytes('abcd'),
  //   )
  //   const slotValue = await usm.getContractStorage(
  //     vitalikDotEth,
  //     setLengthLeft(bigIntToBytes(2n), 32),
  //   )
  //   assert.ok(equalsBytes(slotValue, utf8ToBytes('abcd')), 'should retrieve slot 2 value')
  //   await usm.clearContractStorage(vitalikDotEth)
  //   const clearedStorage = await usm.dumpStorage(vitalikDotEth)
  //   assert.deepEqual({}, clearedStorage, 'storage cache should be empty after clear')
  //   await usm.putContractCode(vitalikDotEth, hexToBytes('0x6000'))
  //   assert.equal(
  //     bytesToHex(await usm.getContractCode(vitalikDotEth)),
  //     '0x6000',
  //     'contract code was found in cache',
  //   )
  // })
})
