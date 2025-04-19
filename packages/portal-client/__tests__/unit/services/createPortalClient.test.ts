import { NetworkId } from 'portalnetwork'
import { assert, beforeEach, describe, it, vi } from 'vitest'
import { createPortalClient } from '../../../src/services/portalNetwork/client'

vi.mock('portalnetwork', () => {
  const MockNetworkId = {
    HistoryNetwork: 'history',
    StateNetwork: 'state',
  }

  const MockTransportLayer = {
    MOBILE: 'mobile',
  }

  const mockClient = {
    discv5: {
      enr: {
        setLocationMultiaddr: vi.fn(),
        getLocationMultiaddr: () => ({
          toOptions: () => ({ port: 9000 }),
        }),
        kvs: new Map(),
      },
    },
    networks: new Map([
      [MockNetworkId.HistoryNetwork, { networkId: MockNetworkId.HistoryNetwork }],
      [MockNetworkId.StateNetwork, { networkId: MockNetworkId.StateNetwork }],
    ]),
    start: vi.fn().mockResolvedValue(undefined),
    storeNodeDetails: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    bootstrap: vi.fn().mockResolvedValue(undefined),
    enableLog: vi.fn().mockResolvedValue(undefined),
  }

  return {
    NetworkId: MockNetworkId,
    TransportLayer: MockTransportLayer,
    createPortalNetwork: vi.fn().mockResolvedValue(mockClient),
    DEFAULT_BOOTNODES: {
      mainnet: ['enr:-example-bootnode'],
    },
  }
})

describe('Portal Client Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize portal client with correct configuration', async () => {
    const port = 9000
    const client = await createPortalClient(port)

    // Verify client creation
    assert.isDefined(client, 'Client should be defined')

    // Verify network support (using our mock values)
    assert.isDefined(
      client.networks.get(NetworkId.HistoryNetwork),
      'Should support History Network',
    )
    assert.isDefined(client.networks.get(NetworkId.StateNetwork), 'Should support State Network')

    // Verify ENR configuration
    const enr = client.discv5.enr
    assert.isDefined(enr.getLocationMultiaddr('udp'), 'ENR should have UDP address')
    assert.equal(
      enr.getLocationMultiaddr('udp')?.toOptions().port ?? 0,
      port,
      'ENR should have correct port',
    )

    // Verify lifecycle methods were called
    const startSpy = vi.spyOn(client, 'start')
    const bootstrapSpy = vi.spyOn(client, 'bootstrap')

    await client.start()
    await client.bootstrap()

    assert.isTrue(startSpy.mock.calls.length > 0, 'start() should be called')
    assert.isTrue(bootstrapSpy.mock.calls.length > 0, 'bootstrap() should be called')
  })
})
