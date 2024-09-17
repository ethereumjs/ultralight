import { SignableENR } from '@chainsafe/enr'
import { createSecp256k1PeerId } from '@libp2p/peer-id-factory'
import { describe, expect, it } from 'vitest'

import { NetworkId, PortalNetwork } from '../../../src/index.js'

import type { StateNetwork } from '../../../src/index.js'

describe('StateNetwork', async () => {
  const pk = await createSecp256k1PeerId()
  const enr1 = SignableENR.createFromPeerId(pk)
  const ultralight = await PortalNetwork.create({
    bindAddress: '127.0.0.1',
    config: {
      enr: enr1,
      peerId: pk,
    },
    supportedNetworks: [{ networkId: NetworkId.StateNetwork }],
  })
  const stateNetwork = ultralight.networks.get(NetworkId.StateNetwork)
  it('should start with state network', () => {
    expect(stateNetwork).toBeDefined()
  })
  it('should instantiate StateDB', () => {
    expect((stateNetwork as StateNetwork).stateDB).exist
    expect((stateNetwork as StateNetwork).stateDB.db).exist
  })
})
