import { assert, describe, it } from 'vitest'
import { StateProtocol } from '../../../src/subprotocols/state/state.js'
import { UltralightStateManager } from '../../../src/subprotocols/state/stateManager.js'
import { Account, Address, hexToBytes, randomBytes } from '@ethereumjs/util'
import { PortalNetwork } from '../../../src/client/client.js'
import { TransportLayer } from '../../../src/client/types.js'
import { ProtocolId } from '../../../src/subprotocols/types.js'
import { createFromProtobuf } from '@libp2p/peer-id-factory'
import { SignableENR } from '@chainsafe/discv5/enr'
import { multiaddr } from '@multiformats/multiaddr'

import { Trie } from '@ethereumjs/trie'
import { AccountTrieProofType } from '../../../src/subprotocols/state/types.js'

const privateKeys = [
  '0x0a2700250802122102273097673a2948af93317235d2f02ad9cf3b79a34eeb37720c5f19e09f11783c12250802122102273097673a2948af93317235d2f02ad9cf3b79a34eeb37720c5f19e09f11783c1a2408021220aae0fff4ac28fdcdf14ee8ecb591c7f1bc78651206d86afe16479a63d9cb73bd',
]
const id1 = await createFromProtobuf(hexToBytes(privateKeys[0]))
const enr1 = SignableENR.createFromPeerId(id1)
const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/3000`)
enr1.setLocationMultiaddr(initMa)
describe('UltralightStateManager', () => {
  it.only('should get account from stateDB when it exists', async () => {
    const node = await PortalNetwork.create({
      transport: TransportLayer.NODE,
      supportedProtocols: [ProtocolId.StateNetwork],
      config: {
        enr: enr1,
        bindAddrs: {
          ip4: initMa,
        },
        peerId: id1,
      },
    })
    const protocol = node.protocols.get(ProtocolId.StateNetwork) as StateProtocol
    const usm = new UltralightStateManager(protocol)

    const pk = randomBytes(32)
    const address = Address.fromPrivateKey(pk)
    const account = Account.fromAccountData({ balance: 0n, nonce: 1n })

    const trie = new Trie()
    await trie.put(address.bytes, account.serialize())

    const proof = await trie.createProof(address.bytes)
    const content = AccountTrieProofType.serialize({
      balance: account!.balance,
      nonce: account!.nonce,
      codeHash: account!.codeHash,
      storageRoot: account!.storageRoot,
      witnesses: proof,
    })
    await protocol.stateDB.inputAccountTrieProof(address.bytes, trie.root(), content)

    const gotAccount = await usm.getAccount(address)
    assert.equal(gotAccount?.balance, account.balance, 'retrieved account from state manager')
  })
})
