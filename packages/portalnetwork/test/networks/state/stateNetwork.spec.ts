import { SignableENR } from '@chainsafe/enr'
import { createSecp256k1PeerId } from '@libp2p/peer-id-factory'
import { describe, expect, it } from 'vitest'

import { NetworkId, PortalNetwork } from '../../../src/index.js'

import type { StateNetwork } from '../../../src/index.js'

describe('StateNetwork', async () => {
  const pk = await createSecp256k1PeerId()
  const enr1 = SignableENR.createFromPeerId(pk)
  const r = 4n
  const radius = 2n ** (256n - r) - 1n
  const ultralight = await PortalNetwork.create({
    config: {
      enr: enr1,
      peerId: pk,
    },
    radius,
    supportedNetworks: [NetworkId.StateNetwork],
  })
  const stateNetwork = ultralight.networks.get(NetworkId.StateNetwork)
  it('should start with state network', () => {
    expect(stateNetwork).toBeDefined()
  })
  it('should instantiate StateDB', () => {
    expect((stateNetwork as StateNetwork).stateDB).exist
    expect((stateNetwork as StateNetwork).stateDB.db).exist
  })
  it('should connect client db to stateDB', async () => {
    ultralight.db.put(NetworkId.StateNetwork, '0x1234', 'testvalue')
    const value = await stateNetwork!.get(NetworkId.StateNetwork, '0x1234')
    expect(value).toEqual('testvalue')
    stateNetwork!.put(NetworkId.StateNetwork, '0xabcd', 'testvalue2')
    const value2 = await ultralight.db.get(NetworkId.StateNetwork, '0xabcd')
    expect(value2).toEqual('testvalue2')
  })
})
