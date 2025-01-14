import { PortalNetwork } from '../../../portalnetwork/src'
import { NetworkId, TransportLayer } from '../../../portalnetwork/src/index'
import { main } from '../../../portalnetwork/examples/src/index'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as config from '../../../portalnetwork/examples/src/config'

describe('main function', () => {
  let mockNode: any

  beforeEach(() => {
    mockNode = {
      start: vi.fn(),
      stop: vi.fn(),
      enableLog: vi.fn(),
      on: vi.fn(),
      sendPortalNetworkMessage: vi.fn(),
      discv5: {
        enr: {
          toENR: vi.fn().mockReturnValue('mock-enr-string'),
        }
      },
      networks: {
        [NetworkId.HistoryNetwork]: {
          ping: vi.fn(),
          findNodes: vi.fn(),
        },
        [NetworkId.StateNetwork]: {
          ping: vi.fn(),
          findNodes: vi.fn(),
        }
      }
    }
    vi.spyOn(PortalNetwork, 'create').mockResolvedValue(mockNode)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should create and start a node, execute a method, and stop the node on SIGINT', async () => {
    const mockArgs = {
      method: 'portal_statePing',
      params: '[]',
      port: 9090,
    }
    vi.spyOn(config, 'parseArgs').mockResolvedValue(mockArgs)

    const processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called')
    })

    let sigintHandler: Function = () => {}
    const processOnSpy = vi.spyOn(process, 'on').mockImplementation((event, handler) => {
      if (event === 'SIGINT') {
        sigintHandler = handler
      }
      return process
    })

    const mainPromise = main()
    
    await new Promise(resolve => setTimeout(resolve, 0))

    sigintHandler()

    await expect(mainPromise).rejects.toThrow('process.exit called')

    expect(PortalNetwork.create).toHaveBeenCalledWith({
      transport: TransportLayer.NODE,
      supportedNetworks: [
        { networkId: NetworkId.HistoryNetwork },
        { networkId: NetworkId.StateNetwork },
      ],
      config: {
        enr: expect.any(Object),
        bindAddrs: { ip4: expect.any(Object) },
        privateKey: expect.any(Object),
      },
    })

    expect(mockNode.start).toHaveBeenCalled()
    expect(mockNode.enableLog).toHaveBeenCalledWith('*Portal*,*uTP*,*discv5*')
    expect(mockNode.on).toHaveBeenCalledWith('SendTalkReq', expect.any(Function))
    expect(mockNode.on).toHaveBeenCalledWith('SendTalkResp', expect.any(Function))
    expect(mockNode.stop).toHaveBeenCalled()
    expect(processExitSpy).toHaveBeenCalledWith(0)

    processExitSpy.mockRestore()
    processOnSpy.mockRestore()
  })

  it('should handle errors during node creation and stop the node', async () => {
    const error = new Error('Failed to create node')
    vi.spyOn(PortalNetwork, 'create').mockRejectedValue(error)
    vi.spyOn(config, 'parseArgs').mockResolvedValue({
      method: 'portal_statePing',
      params: '[]',
      port: 9090
    })

    const processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called')
    })

    await expect(main()).rejects.toThrow('process.exit called')
    expect(processExitSpy).toHaveBeenCalledWith(1)

    processExitSpy.mockRestore()
  })

  it('should handle errors during method execution and stop the node', async () => {
    vi.spyOn(config, 'parseArgs').mockResolvedValue({
      method: 'portal_unknownMethod',
      params: '[]',
      port: 9090
    })

    const processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called')
    })

    await expect(main()).rejects.toThrow('process.exit called')
    expect(mockNode.stop).toHaveBeenCalled()
    expect(processExitSpy).toHaveBeenCalledWith(1)

    processExitSpy.mockRestore()
  })
})
