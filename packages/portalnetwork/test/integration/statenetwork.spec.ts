import { SignableENR } from '@chainsafe/discv5'
import { fromHexString, toHexString } from '@chainsafe/ssz'
import { createFromProtobuf } from '@libp2p/peer-id-factory'
import { multiaddr } from '@multiformats/multiaddr'
import tape from 'tape'
import {
  AccountTrieProofKeyType,
  AccountTrieProofType,
  PortalNetwork,
  TransportLayer,
  ProtocolId,
  StateProtocol,
} from '../../src/index.js'
import fs from 'fs'
import { EventEmitter } from 'events'

type Content = string
type ContentKey = string
const stateContent: Record<ContentKey, Content> = JSON.parse(
  fs.readFileSync('test/subprotocols/state/statenet_content.json', 'ascii')
)
const privateKeys = [
  '0x0a2700250802122102273097673a2948af93317235d2f02ad9cf3b79a34eeb37720c5f19e09f11783c12250802122102273097673a2948af93317235d2f02ad9cf3b79a34eeb37720c5f19e09f11783c1a2408021220aae0fff4ac28fdcdf14ee8ecb591c7f1bc78651206d86afe16479a63d9cb73bd',
  '0x0a27002508021221039909a8a7e81dbdc867480f0eeb7468189d1e7a1dd7ee8a13ee486c8cbd743764122508021221039909a8a7e81dbdc867480f0eeb7468189d1e7a1dd7ee8a13ee486c8cbd7437641a2408021220c6eb3ae347433e8cfe7a0a195cc17fc8afcd478b9fb74be56d13bccc67813130',
]

tape('Start 2 StateNetwork nodes and connect', async (t) => {
  const id1 = await createFromProtobuf(fromHexString(privateKeys[0]))
  const enr1 = SignableENR.createFromPeerId(id1)
  const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/3000`)
  enr1.setLocationMultiaddr(initMa)
  const id2 = await createFromProtobuf(fromHexString(privateKeys[1]))
  const enr2 = SignableENR.createFromPeerId(id2)
  const initMa2: any = multiaddr(`/ip4/127.0.0.1/udp/3001`)
  enr2.setLocationMultiaddr(initMa2)
  const node1 = await PortalNetwork.create({
    transport: TransportLayer.NODE,
    supportedProtocols: [ProtocolId.StateNetwork],
    config: {
      enr: enr1,
      multiaddr: initMa,
      peerId: id1,
    },
  })
  const node2 = await PortalNetwork.create({
    transport: TransportLayer.NODE,
    supportedProtocols: [ProtocolId.StateNetwork],
    config: {
      enr: enr2,
      multiaddr: initMa2,
      peerId: id2,
    },
  })

  await node1.start()
  await node2.start()
  const protocol1 = node1.protocols.get(ProtocolId.StateNetwork)
  const protocol2 = node2.protocols.get(ProtocolId.StateNetwork)

  t.ok(protocol1, 'protocol1 exists')
  t.ok(protocol2, 'protocol2 exists')
  if (!protocol1 || !protocol2) {
    t.fail('protocol1 or protocol2 does not exist')
    node1.removeAllListeners()
    node2.removeAllListeners()
    await node1.stop()
    await node2.stop()
    t.end()
  } else {
    const stateProtocol1 = protocol1 as StateProtocol
    const stateProtocol2 = protocol2 as StateProtocol

    const ping = await new Promise((res, _rej) => {
      stateProtocol1.sendPing(protocol2.enr.toENR()).then((pong) => {
        pong ? res(true) : res(false)
      })
    })
    t.ok(ping, 'ping pong 1 -> 2 successful')
    const ping2 = await new Promise((res, _rej) => {
      stateProtocol2.sendPing(protocol1.enr.toENR()).then((pong) => {
        pong ? res(true) : res(false)
      })
    })
    t.ok(ping2, 'ping pong 2 -> 1 successful')
    t.equal(
      stateProtocol1.routingTable.getValue(
        '8a47012e91f7e797f682afeeab374fa3b3186c82de848dc44195b4251154a2ed'
      )?.nodeId,
      '8a47012e91f7e797f682afeeab374fa3b3186c82de848dc44195b4251154a2ed',
      'node1 added node2 to routing table'
    )
    t.equal(
      stateProtocol2.routingTable.getValue(node1.discv5.enr.nodeId)?.nodeId,
      node1.discv5.enr.nodeId,
      'node2 added node1 to routing table'
    )
    node1.removeAllListeners()
    node2.removeAllListeners()
    await node1.stop()
    await node2.stop()
    t.end()
  }
})
tape('Store and Retrieve state_network content and account info from Local DB', async (t) => {
  const id1 = await createFromProtobuf(fromHexString(privateKeys[0]))
  const enr1 = SignableENR.createFromPeerId(id1)
  const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/3000`)
  enr1.setLocationMultiaddr(initMa)
  const node1 = await PortalNetwork.create({
    transport: TransportLayer.NODE,
    supportedProtocols: [ProtocolId.StateNetwork],
    config: {
      enr: enr1,
      multiaddr: initMa,
      peerId: id1,
    },
  })
  await node1.start()
  const protocol1 = node1.protocols.get(ProtocolId.StateNetwork)
  const stateProtocol1 = protocol1 as StateProtocol
  const [contentKey0, content0] = Object.entries(stateContent)[0]
  await stateProtocol1.store(fromHexString(contentKey0), fromHexString(content0))
  const retrieved0 = await stateProtocol1.retrieveAccountTrieProof(fromHexString(contentKey0))
  t.ok(retrieved0, 'stored and retrieved content0')
  t.deepEqual(retrieved0, fromHexString(content0), 'content0 matches retrieved')
  const { address, stateRoot } = AccountTrieProofKeyType.deserialize(fromHexString(contentKey0))
  const accountTrieProof = AccountTrieProofType.deserialize(retrieved0)
  const account = await stateProtocol1.stateDB.getAccountRecord(toHexString(address))
  t.ok(account, 'account exists')
  t.deepEqual(
    fromHexString(Object.keys(account.accounts)[0]),
    stateRoot,
    'account at state_root retrievable from DB'
  )
  t.equal(
    account.accounts[toHexString(stateRoot)].balance,
    accountTrieProof.balance,
    'account balance at state_root retrievable from DB'
  )
  node1.removeAllListeners()
  await node1.stop()
  t.end()
})
tape('Retrieve AccountTrieProof with sendFindContent', async (t) => {
  const id1 = await createFromProtobuf(fromHexString(privateKeys[0]))
  const enr1 = SignableENR.createFromPeerId(id1)
  const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/3000`)
  enr1.setLocationMultiaddr(initMa)
  const id2 = await createFromProtobuf(fromHexString(privateKeys[1]))
  const enr2 = SignableENR.createFromPeerId(id2)
  const initMa2: any = multiaddr(`/ip4/127.0.0.1/udp/3001`)
  enr2.setLocationMultiaddr(initMa2)
  const node1 = await PortalNetwork.create({
    transport: TransportLayer.NODE,
    supportedProtocols: [ProtocolId.StateNetwork],
    config: {
      enr: enr1,
      multiaddr: initMa,
      peerId: id1,
    },
  })
  const node2 = await PortalNetwork.create({
    transport: TransportLayer.NODE,
    supportedProtocols: [ProtocolId.StateNetwork],
    config: {
      enr: enr2,
      multiaddr: initMa2,
      peerId: id2,
    },
  })

  await node1.start()
  await node2.start()
  const protocol1 = node1.protocols.get(ProtocolId.StateNetwork)
  const protocol2 = node2.protocols.get(ProtocolId.StateNetwork)

  t.ok(protocol1, 'protocol1 exists')
  t.ok(protocol2, 'protocol2 exists')
  if (!protocol1 || !protocol2) {
    t.fail('protocol1 or protocol2 does not exist')
    node1.removeAllListeners()
    node2.removeAllListeners()
    await node1.stop()
    await node2.stop()
    t.end()
  } else {
    const stateProtocol1 = protocol1 as StateProtocol
    const stateProtocol2 = protocol2 as StateProtocol

    const ping = await new Promise((res, _rej) => {
      stateProtocol1.sendPing(protocol2.enr.toENR()).then((pong) => {
        pong ? res(true) : res(false)
      })
    })
    t.ok(ping, 'ping pong 1 -> 2 successful')
    const ping2 = await new Promise((res, _rej) => {
      stateProtocol2.sendPing(protocol1.enr.toENR()).then((pong) => {
        pong ? res(true) : res(false)
      })
    })
    t.ok(ping2, 'ping pong 2 -> 1 successful')
    t.equal(
      stateProtocol1.routingTable.getValue(
        '8a47012e91f7e797f682afeeab374fa3b3186c82de848dc44195b4251154a2ed'
      )?.nodeId,
      '8a47012e91f7e797f682afeeab374fa3b3186c82de848dc44195b4251154a2ed',
      'node1 added node2 to routing table'
    )
    t.equal(
      stateProtocol2.routingTable.getValue(node1.discv5.enr.nodeId)?.nodeId,
      node1.discv5.enr.nodeId,
      'node2 added node1 to routing table'
    )
    const [contentKey0, content0] = Object.entries(stateContent)[0]
    await stateProtocol1.store(fromHexString(contentKey0), fromHexString(content0))
    const stored0 = await stateProtocol1.retrieveAccountTrieProof(fromHexString(contentKey0))
    t.deepEqual(stored0, fromHexString(content0), 'content0 stored by node1')
    const end = new EventEmitter()
    const to = setTimeout(() => {
      t.fail('timeout')
      end.emit('done')
    }, 500)
    await stateProtocol2.sendFindContent(protocol1.enr.nodeId, fromHexString(contentKey0))
    stateProtocol2.on('ContentAdded', async (type, key, content) => {
      clearTimeout(to)
      t.equal(key, contentKey0, 'Node 2 added ContentKey')
      t.deepEqual(content, content0, 'Node 2 added Content')
      const { address, stateRoot } = AccountTrieProofKeyType.deserialize(fromHexString(key))
      const accountTrieProof = AccountTrieProofType.deserialize(fromHexString(content))
      const account = await stateProtocol2.stateDB.getAccountRecord(toHexString(address))
      t.equal(account.address, toHexString(address), 'account address found in Node 2 DB')
      t.deepEqual(
        fromHexString(Object.keys(account.accounts)[0]),
        stateRoot,
        'account at state_root retrievable from Node2 DB'
      )
      t.equal(
        account.accounts[toHexString(stateRoot)].balance,
        accountTrieProof.balance,
        'account balance at state_root retrievable from Node2 DB'
      )

      end.emit('done')
    })
    await new Promise((res) => {
      end.on('done', res)
    })
    node1.removeAllListeners()
    node2.removeAllListeners()
    await node1.stop()
    await node2.stop()
    t.end()
  }
})
