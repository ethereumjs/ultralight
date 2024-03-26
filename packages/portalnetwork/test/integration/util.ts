import { SignableENR, distance } from '@chainsafe/discv5'
import { fromHexString, toHexString } from '@chainsafe/ssz'
import { Chain, Common, Hardfork } from '@ethereumjs/common'
import { getGenesis } from '@ethereumjs/genesis'
import { DefaultStateManager } from '@ethereumjs/statemanager'
import { ExtensionNode, Trie, decodeNode } from '@ethereumjs/trie'
import { bytesToUnprefixedHex, padToEven } from '@ethereumjs/util'
import { VM } from '@ethereumjs/vm'
import { createFromProtobuf } from '@libp2p/peer-id-factory'
import { multiaddr } from '@multiformats/multiaddr'
import { assert, expect, it } from 'vitest'

import {
  AccountTrieNodeContentKey,
  AccountTrieNodeOffer,
  NetworkId,
  PortalNetwork,
  TransportLayer,
  packNibbles,
} from '../../src/index.js'
import { mainnet } from '../../src/networks/state/genesis.js'

import type { StateNetwork, TAccountTrieNodeKey, TNibble } from '../../src/index.js'
import type { StateDB } from '../../src/networks/state/statedb.js'
import type { LeafNode } from '@ethereumjs/trie'

export const protoBufs = [
  '0x0a27002508021221024776a66a32c732ff71d6477fab2beb1e1b303ae157c3b5d95789aa52b1740b82122508021221024776a66a32c732ff71d6477fab2beb1e1b303ae157c3b5d95789aa52b1740b821a240802122091b5cbbc2bf054f913c3a344bf8ce6d19373142854eabeeffb5a3f159c44e610',
  '0x0a2700250802122103d2a342da6a4fe1598f83df70bfcf9047e24eb7804799067c680870989e4ff0b412250802122103d2a342da6a4fe1598f83df70bfcf9047e24eb7804799067c680870989e4ff0b41a24080212202a63200954ac3c187131b79d39f16ef601d83d57f882b58acdad0dd346c06258',
  '0x0a2700250802122103879ca6d3b9e51e746f90704496e3c36a0c473e0ec734dfa52bd8be50c7c4044c12250802122103879ca6d3b9e51e746f90704496e3c36a0c473e0ec734dfa52bd8be50c7c4044c1a24080212204d9ce45403c77746d795f6f01bafd81b5e4dfd9f7bfd6bd2edd9a06f32d86e36',
  '0x0a270025080212210297b980a75593bc2c9f3ffc0d393a240b8d7b26465bcbc0b8a488f01202b962cd1225080212210297b980a75593bc2c9f3ffc0d393a240b8d7b26465bcbc0b8a488f01202b962cd1a24080212204c768f46d83b047fe5f7521f77b2feb3f182df96a39543f9b9b09f3c7e1a4e29',
  '0x0a2700250802122102a80d91fa0da65157cf3e7d44cf5a070c01f5a37f5c77536c421813dbe3fe874a12250802122102a80d91fa0da65157cf3e7d44cf5a070c01f5a37f5c77536c421813dbe3fe874a1a24080212203676d8bd61041188b449f9517a51837d415f01caa10f81c7bd22febca0eadf3b',
  '0x0a27002508021221030bc06a165852567cd1f47728741e44aa8c1445e2f64176866a42f658bb9f13fe122508021221030bc06a165852567cd1f47728741e44aa8c1445e2f64176866a42f658bb9f13fe1a24080212205be348796815dabfd5c89d2d4dba943f3314a59a47e4d21b2a1a1b66fff330da',
]

export const getClients = async (port: number) => {
  const peerIds = await Promise.all(
    protoBufs.map(async (protoBuf) => {
      const peerId = await createFromProtobuf(fromHexString(protoBuf))
      return peerId
    }),
  )
  const clients = await Promise.all(
    peerIds.map(async (peerId, i) => {
      const enr = SignableENR.createFromPeerId(peerId)
      const initMa: any = multiaddr(`/ip4/172.17.0.1/udp/${port + i}`)
      enr.setLocationMultiaddr(initMa)
      const node = await PortalNetwork.create({
        transport: TransportLayer.NODE,
        supportedNetworks: [NetworkId.StateNetwork],
        config: {
          enr,
          bindAddrs: {
            ip4: initMa,
          },
          peerId,
        },
        radius: 2n ** 255n,
      })
      await node.start()
      return node
    }),
  )
  const networks: StateNetwork[] = clients.map(
    (client) => client.networks.get(NetworkId.StateNetwork) as StateNetwork,
  )
  return { clients, networks }
}

export const getVM = async (trie?: Trie) => {
  const common = new Common({
    chain: Chain.Mainnet,
    hardfork: Hardfork.Chainstart,
  })
  const genesis = getGenesis(1)
  const stateManager = new DefaultStateManager({
    trie,
    common,
    accountCacheOpts: {
      deactivate: true,
    },
  })
  const vm = await VM.create({
    common,
    stateManager,
    genesisState: genesis,
  })
  return vm
}

export const genesisContent = async (
  trie: Trie,
): Promise<{
  leafNodeContent: [string, Uint8Array][]
  trieNodeContent: [string, Uint8Array][]
  nodePaths: Record<string, { nodeBytes: Uint8Array; nibbles: TNibble[] }>
}> => {
  const nodePaths: Record<string, { nodeBytes: Uint8Array; nibbles: TNibble[] }> = {}
  await trie.walkAllNodes(async (node, key) => {
    const nodeBytes = node.serialize()
    const node_hash = trie['hash'](nodeBytes)
    const nibbles = key.map((n) => n.toString(16)) as TNibble[]
    nodePaths[toHexString(node_hash)] = { nodeBytes, nibbles }
  })

  const proofs = await Promise.all(
    Object.keys(mainnet.alloc).map(async (add) => {
      const address = '0x' + padToEven(add)
      const leafproof = await trie.createProof(fromHexString(address))
      return { address, leafproof }
    }),
  )
  const leafProofs: [Uint8Array, { nibbles: string[]; proof: Uint8Array[] }][] = proofs.map(
    ({ address, leafproof }) => {
      const addressPath = bytesToUnprefixedHex(trie['hash'](fromHexString(address))).split('')
      const nodePath: string[] = []
      for (const p of leafproof.slice(0, -1)) {
        const node = decodeNode(p)
        if (node instanceof ExtensionNode) {
          nodePath.push(...addressPath.splice(0, node.keyLength()))
        } else {
          nodePath.push(addressPath.shift()!)
        }
      }
      const leafNode = decodeNode(leafproof[leafproof.length - 1]) as LeafNode
      if (addressPath.length !== leafNode.keyLength()) {
        throw new Error(`${addressPath.length} !== ${leafNode.keyLength()}`) // keyLength where keyLength is Uint8
      }
      const nodehash = trie['hash'](leafproof[leafproof.length - 1])
      return [nodehash, { nibbles: nodePath, proof: leafproof }]
    },
  )
  const allProofs: Record<string, { nibbles: TNibble[]; proof: Uint8Array[] }> = {}
  for (const [_, { proof }] of leafProofs) {
    for (const [idx, n] of proof.slice(0, -1).entries()) {
      const hash = toHexString(trie['hash'](n))
      if (hash in allProofs) continue
      const nodeProof = proof.slice(0, idx + 1)
      const nodeNibbles: TNibble[] = nodePaths[hash].nibbles
      allProofs[hash] = { nibbles: nodeNibbles, proof: nodeProof }
    }
  }
  const leafNodeContent: [string, Uint8Array][] = leafProofs.map(
    ([nodeHash, { nibbles, proof }]) => {
      const path = packNibbles(nibbles as TNibble[])
      const key: TAccountTrieNodeKey = {
        nodeHash,
        path,
      }
      const contentKey = toHexString(AccountTrieNodeContentKey.encode(key))
      const content = AccountTrieNodeOffer.serialize({
        blockHash: fromHexString(
          '0xd4e56740f876aef8c010b86a40d5f56745a118d0906a34e69aec8c0db1cb8fa3',
        ),
        proof,
      })
      return [contentKey, content]
    },
  )
  const trieNodeContent: [string, Uint8Array][] = Object.entries(allProofs).map(
    ([nodeHash, { nibbles, proof }]) => {
      const path = packNibbles(nibbles as TNibble[])
      const key: TAccountTrieNodeKey = {
        nodeHash: fromHexString(nodeHash),
        path,
      }
      const contentKey = toHexString(AccountTrieNodeContentKey.encode(key))
      const content = AccountTrieNodeOffer.serialize({
        blockHash: fromHexString(
          '0xd4e56740f876aef8c010b86a40d5f56745a118d0906a34e69aec8c0db1cb8fa3',
        ),
        proof,
      })
      return [contentKey, content]
    },
  )

  return { leafNodeContent, trieNodeContent, nodePaths }
}

export const sortedById = (
  {
    leafNodeContent,
    trieNodeContent,
  }: {
    leafNodeContent: [string, Uint8Array][]
    trieNodeContent: [string, Uint8Array][]
  },
  clients: { nodeId: string; radius: bigint }[],
): Record<string, Uint8Array[]> => {
  const trieNodes: Record<string, Uint8Array[]> = Object.fromEntries(
    clients.map(({ nodeId }) => [nodeId, []]),
  )
  const allContent = [...leafNodeContent, ...trieNodeContent]
  for (const [contentKey] of allContent) {
    const contentId = new Trie({ useKeyHashing: true })['hash'](fromHexString(contentKey))
    for (const { nodeId, radius } of clients) {
      const d = distance(nodeId, bytesToUnprefixedHex(contentId))
      if (d < radius) {
        const { nodeHash } = AccountTrieNodeContentKey.decode(fromHexString(contentKey))
        trieNodes[nodeId].push(nodeHash)
      }
    }
  }
  return trieNodes
}

export const populateGenesisDB = async (trie: Trie, networks: StateNetwork[]) => {
  const statedbs: Record<string, StateDB> = Object.fromEntries(
    networks.map((network) => [network.enr.nodeId, network.stateDB]),
  )
  const { leafNodeContent, trieNodeContent, nodePaths } = await genesisContent(trie)
  const nodeIdRadius = networks.map((n) => {
    return { nodeId: n.enr.nodeId, radius: n.nodeRadius }
  })
  const sortedNodeHashByClient = sortedById({ leafNodeContent, trieNodeContent }, nodeIdRadius)
  for (const [nodeId, nodeHashes] of Object.entries(sortedNodeHashByClient)) {
    const db = statedbs[nodeId].db
    for (const nodeHash of nodeHashes) {
      await db.put(
        bytesToUnprefixedHex(nodeHash),
        bytesToUnprefixedHex(nodePaths[toHexString(nodeHash)].nodeBytes),
      )
    }
  }
  return sortedNodeHashByClient
}
export const connectNetwork = async (networks: StateNetwork[], clients: PortalNetwork[]) => {
  for (const [idx, network] of networks.entries()) {
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
}
