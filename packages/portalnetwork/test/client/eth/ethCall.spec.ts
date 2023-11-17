import { SignableENR } from '@chainsafe/discv5'
import { fromHexString, toHexString } from '@chainsafe/ssz'
import { Block } from '@ethereumjs/block'
import { Trie } from '@ethereumjs/trie'
import { Account, Address, bytesToInt, bytesToUtf8, randomBytes } from '@ethereumjs/util'
import { createFromProtobuf } from '@libp2p/peer-id-factory'
import { multiaddr } from '@multiformats/multiaddr'
import { keccak256 } from 'ethereum-cryptography/keccak.js'
import { assert, describe, it } from 'vitest'

import {
  AccountTrieProofType,
  ContractByteCodeType,
  NetworkId,
  PortalNetwork,
  TransportLayer,
  UltralightStateManager,
  addRLPSerializedBlock,
} from '../../../src/index.js'

import type { HistoryNetwork, RpcTx, StateNetwork } from '../../../src/index.js'

const privateKeys = [
  '0x0a2700250802122102273097673a2948af93317235d2f02ad9cf3b79a34eeb37720c5f19e09f11783c12250802122102273097673a2948af93317235d2f02ad9cf3b79a34eeb37720c5f19e09f11783c1a2408021220aae0fff4ac28fdcdf14ee8ecb591c7f1bc78651206d86afe16479a63d9cb73bd',
]
const id1 = await createFromProtobuf(fromHexString(privateKeys[0]))
const enr1 = SignableENR.createFromPeerId(id1)
const initMa = multiaddr(`/ip4/127.0.0.1/udp/0`)

describe('ethCall', () => {
  it('should be able to retrieve bytecode necessary to execute evm.runCall', async () => {
    // Greeter contract Solidity code
    // pragma solidity >= 0.8.0;

    // // SPDX-License-Identifier: MIT

    // contract Greeter {
    //   string private _greeting = "Hello, World!";
    //   address private _owner;

    //   function greet() external pure returns(string memory) {
    //     return 'hello';
    //   }

    //   function owner() public view returns(address) {
    //     return _owner;
    //   }
    // }
    const greeterBytecode =
      '0x608060405234801561000f575f80fd5b5060043610610034575f3560e01c80638da5cb5b14610038578063cfae321714610056575b5f80fd5b610040610074565b60405161004d9190610118565b60405180910390f35b61005e61009c565b60405161006b91906101bb565b60405180910390f35b5f60015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff16905090565b60606040518060400160405280600581526020017f68656c6c6f000000000000000000000000000000000000000000000000000000815250905090565b5f73ffffffffffffffffffffffffffffffffffffffff82169050919050565b5f610102826100d9565b9050919050565b610112816100f8565b82525050565b5f60208201905061012b5f830184610109565b92915050565b5f81519050919050565b5f82825260208201905092915050565b5f5b8381101561016857808201518184015260208101905061014d565b5f8484015250505050565b5f601f19601f8301169050919050565b5f61018d82610131565b610197818561013b565b93506101a781856020860161014b565b6101b081610173565b840191505092915050565b5f6020820190508181035f8301526101d38184610183565b90509291505056fea2646970667358221220945519e237b301b5baf64c20c2a39b6a8b300541470b28b0e6cfbc1568dc6f3364736f6c63430008160033'
    const byteCode = fromHexString(greeterBytecode)
    const node = await PortalNetwork.create({
      transport: TransportLayer.NODE,
      supportedNetworks: [NetworkId.StateNetwork, NetworkId.HistoryNetwork],
      config: {
        enr: enr1,
        bindAddrs: {
          ip4: initMa,
        },
        peerId: id1,
      },
    })
    const state = node.networks.get(NetworkId.StateNetwork) as StateNetwork
    const history = node.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork
    const usm = new UltralightStateManager(state)

    const pk = randomBytes(32)
    const address = Address.fromPrivateKey(pk)
    const codehash = keccak256(byteCode)
    const account = Account.fromAccountData({ balance: 0n, nonce: 1n, codeHash: codehash })

    const zero = Address.zero()
    const zeroAccount = new Account()
    const trie = new Trie({ useKeyHashing: true })
    await trie.put(address.toBytes(), account.serialize())
    await trie.put(zero.bytes, zeroAccount.serialize())

    const proof = await trie.createProof(address.toBytes())
    const zeroProof = await trie.createProof(zero.bytes)
    const content = AccountTrieProofType.serialize({
      witnesses: proof,
    })
    const zeroContent = AccountTrieProofType.serialize({
      witnesses: zeroProof,
    })
    await state.stateDB.inputAccountTrieProof(address.toBytes(), trie.root(), content)
    await state.stateDB.inputAccountTrieProof(zero.bytes, trie.root(), zeroContent)
    const byteCodeContent = ContractByteCodeType.serialize(byteCode)
    await state.stateDB.inputContractByteCode(address.toBytes(), codehash, byteCodeContent)

    await usm.setStateRoot(trie.root())
    const block = Block.fromBlockData(
      { header: { stateRoot: trie.root(), number: 15537394n } },
      { setHardfork: true },
    )
    await addRLPSerializedBlock(
      toHexString(block.serialize()),
      toHexString(block.header.hash()),
      history,
    )
    await history.indexBlockhash(block.header.number, toHexString(block.header.hash()))

    const greeterInput = '0xcfae3217'

    const tx: RpcTx = {
      to: address.toString(),
      data: greeterInput,
    }
    const res = fromHexString(await node.ETH.ethCall(tx, 15537394n))

    // Decode offset in `returnValue` for start of Solidity return value
    const offset = bytesToInt(res.slice(0, 32))
    // First 32 bytes of return value are length of returned value
    const length = bytesToInt(res.slice(offset, offset + 32))
    // Compute the starting position of the returned value
    const startPosition = offset + 32
    // Compuite the ending position of the returned value
    const endPosition = startPosition + length
    const returnedValue = bytesToUtf8(res.slice(startPosition, endPosition))
    assert.equal(
      returnedValue,
      'hello',
      'got expected greeting from contract stored in Ultralight State Manager',
    )
  })
})
