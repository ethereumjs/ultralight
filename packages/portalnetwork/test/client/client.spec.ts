import * as tape from 'tape'
import {
  PortalNetwork,
  ProtocolId,
  HeaderAccumulatorType,
  HeaderAccumulator,
  HistoryProtocol,
} from '../../src/'
import * as td from 'testdouble'
import { TransportLayer } from '../../src/client'
import { fromHexString, toHexString } from '@chainsafe/ssz'
import * as storedAccumulator from '../../scripts/storedAccumulator.json'
import * as hashArraysObject from '../../../cli/scripts/storedHashArrays.json'
import { HashArray, HashArrayWithProofSSZ } from '../../src'

tape('Client unit tests', async (t) => {
  const node = await PortalNetwork.create({
    bindAddress: '192.168.0.1',
    transport: TransportLayer.WEB,
    supportedProtocols: [ProtocolId.HistoryNetwork],
  })

  t.test('node initialization/startup', async (st) => {
    st.plan(2)
    st.equal(
      node.discv5.enr.getLocationMultiaddr('udp')!.toOptions().host,
      '192.168.0.1',
      'created portal network node with correct ip address'
    )

    node.discv5.start = td.func<any>()
    td.when(node.discv5.start()).thenResolve(st.pass('discv5 client started'))
    await node.start()
  })

  t.test('test cleanup', (st) => {
    td.reset()
    node.stop()
    st.end()
  })

  t.end()
})

tape('Client should initialized with stored Accumulator', async (t) => {
  const accumulator = new HeaderAccumulator({
    initFromGenesis: false,
    storedAccumulator: HeaderAccumulatorType.deserialize(
      fromHexString(storedAccumulator.serialized)
    ),
  })
  const hashTreeRoot = toHexString(HeaderAccumulatorType.hashTreeRoot(accumulator))

  t.test('accumulator builds from file', async (st) => {
    st.equal(
      storedAccumulator.hashTreeRoot,
      hashTreeRoot,
      'Rebuilt Accumulator Hash matches stored'
    )
  })

  const node = await PortalNetwork.create({
    bindAddress: '192.168.0.1',
    transport: TransportLayer.WEB,
    supportedProtocols: [ProtocolId.HistoryNetwork, ProtocolId.CanonicalIndicesNetwork],
    accumulator: accumulator,
  })

  t.test('node initialization/startup', async (st) => {
    st.plan(2)

    st.equal(
      node.discv5.enr.getLocationMultiaddr('udp')!.toOptions().host,
      '192.168.0.1',
      'created portal network node with correct ip address'
    )

    node.discv5.start = td.func<any>()
    td.when(node.discv5.start()).thenResolve(st.pass('discv5 client started'))
    await node.start()
  })

  t.test('accumulator rebuilt from stored', async (st) => {
    const history = node.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
    const rebuilt = history.accumulator
    const hash = toHexString(HeaderAccumulatorType.hashTreeRoot(rebuilt))
    const badHash = toHexString(HeaderAccumulatorType.hashTreeRoot(new HeaderAccumulator({})))
    st.equal(hashTreeRoot, hash, 'Protocol received stored accumulator')
    st.notEqual(badHash, hash, 'Protocol did not replace stored accumulator')
  })

  t.test('test cleanup', (st) => {
    td.reset()
    node.stop()
    st.end()
  })

  t.end()
})

tape('Client should receive snapshot', async (t) => {
  const node = await PortalNetwork.create({
    bindAddress: '192.168.0.1',
    transport: TransportLayer.WEB,
    supportedProtocols: [ProtocolId.HistoryNetwork, ProtocolId.CanonicalIndicesNetwork],
  })

  t.test('node initialization/startup', async (st) => {
    st.plan(2)

    st.equal(
      node.discv5.enr.getLocationMultiaddr('udp')!.toOptions().host,
      '192.168.0.1',
      'created portal network node with correct ip address'
    )

    node.discv5.start = td.func<any>()
    td.when(node.discv5.start()).thenResolve(st.pass('discv5 client started'))
    await node.start()
  })

  t.test('accumulator received as snapshot', async (st) => {
    const history = node.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
    const rebuilt = history.receiveShapshot(fromHexString(storedAccumulator.serialized))
    st.equal(
      rebuilt,
      storedAccumulator.hashTreeRoot,
      'protocol successfully updated accumulator based on snapshot'
    )
  })

  t.test('test cleanup', (st) => {
    td.reset()
    node.stop()
    st.end()
  })

  t.end()
})
tape('Client should initialize with stored HashLists', async (t) => {
  const keys = Object.keys(hashArraysObject)
  const vals = Object.values(hashArraysObject)
  const map: Map<string, string> = new Map()
  keys.forEach((key, idx) => {
    map.set(key, vals[idx])
  })
  const _ha: Record<string, string> = Object.fromEntries(map)
  const node = await PortalNetwork.create({
    bindAddress: '192.168.0.1',
    transport: TransportLayer.WEB,
    supportedProtocols: [ProtocolId.HistoryNetwork, ProtocolId.CanonicalIndicesNetwork],
    hashArrays: _ha,
  })

  t.test('node initialization/startup', async (st) => {
    st.plan(2)
    st.equal(
      node.discv5.enr.getLocationMultiaddr('udp')!.toOptions().host,
      '192.168.0.1',
      'created portal network node with correct ip address'
    )

    node.discv5.start = td.func<any>()
    td.when(node.discv5.start()).thenResolve(st.pass('discv5 client started'))
    await node.start()
  })

  t.test('hashLists stored', async (st) => {
    const _serialized = vals[0]
    const key = keys[0]
    console.log(key)
    const serialized = await node.db.get(key)
    const _deserialized = HashArrayWithProofSSZ.deserialize(fromHexString(_serialized))
    const deserialized = HashArrayWithProofSSZ.deserialize(fromHexString(serialized))
    st.equal(toHexString(_deserialized.proof), toHexString(deserialized.proof))
    st.equal(toHexString(_deserialized.array[0]), toHexString(deserialized.array[0]))
  })
  t.test('test cleanup', (st) => {
    td.reset()
    node.stop()
    st.end()
  })

  t.end()
})
