import { SignableENR } from '@chainsafe/discv5'
import { createSecp256k1PeerId } from '@libp2p/peer-id-factory'
import { describe, expect, it } from 'vitest'

import { NetworkId, PortalNetwork } from '../../../src/index.js'

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
  it('should initialize with correct radius', () => {
    expect(stateNetwork!.nodeRadius).toEqual(radius)
  })
})
