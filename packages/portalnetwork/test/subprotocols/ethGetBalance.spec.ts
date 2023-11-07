import { describe, it, assert } from 'vitest'
import { PortalNetwork, ProtocolId } from '../../src'

describe('ethGetBalance using HistoryProtocol and StateProtocol', async () => {
  const ultralight = await PortalNetwork.create({
    supportedProtocols: [ProtocolId.HistoryNetwork, ProtocolId.StateNetwork],
  })
})
