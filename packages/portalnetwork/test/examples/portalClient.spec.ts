import { PortalNetwork } from '../../../portalnetwork/src'
import { NetworkId, TransportLayer } from '../../../portalnetwork/src/index'
import { main } from '../../../portalnetwork/examples/src/index'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as config from '../../../portalnetwork/examples/src/config'

describe('main function', () => {
  let mockNode: any

  beforeEach(() => {
    mockNode = {
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
      enableLog: vi.fn(),
      on: vi.fn(),
      sendPortalNetworkMessage: vi.fn(),
      discv5: {
        enr: {
          toENR: vi.fn().mockReturnValue('mock-enr-string')
        }
      },
      networks: {
        [NetworkId.HistoryNetwork]: {
          ping: vi.fn().mockResolvedValue(undefined),
          findNodes: vi.fn().mockResolvedValue(undefined),
        },
        [NetworkId.StateNetwork]: {
          ping: vi.fn().mockResolvedValue(undefined),
          findNodes: vi.fn().mockResolvedValue(undefined),
        }
      }
    }
    vi.spyOn(PortalNetwork, 'create').mockResolvedValue(mockNode)
    
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('should create and start a node, execute a method, and stop the node on SIGINT', async () => {
    const mockArgs = {
      method: 'portal_statePing',
      params: '[]',
      port: 9090
    }
    vi.spyOn(config, 'parseArgs').mockResolvedValue(mockArgs)

    let sigintCallback: Function | null = null
    const processOnSpy = vi.spyOn(process, 'on').mockImplementation((event: string, cb: any) => {
      if (event === 'SIGINT') {
        sigintCallback = cb
      }
      return process
    })

    const processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)
    
    const mainPromise = main()

    await vi.runAllTimersAsync()
    
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
    
    expect(sigintCallback).toBeTruthy()
    await sigintCallback!()
    await Promise.resolve()
    
    expect(mockNode.stop).toHaveBeenCalled()
    expect(processExitSpy).toHaveBeenCalledWith(0)

    processOnSpy.mockRestore()
    processExitSpy.mockRestore()
  })

  it('should handle errors during node creation and stop the node', async () => {
    const error = new Error('Failed to create node')
    vi.spyOn(PortalNetwork, 'create').mockRejectedValue(error)
    
    const mockArgs = {
      method: 'portal_statePing',
      params: '[]',
      port: 9090,
    }
    vi.spyOn(config, 'parseArgs').mockResolvedValue(mockArgs)

    let sigintCallback: Function | null = null
    const processOnSpy = vi.spyOn(process, 'on').mockImplementation((event: string, cb: any) => {
      if (event === 'SIGINT') {
        sigintCallback = cb
      }
      return process
    })

    const processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const mainPromise = main()
    
    await vi.runAllTimersAsync()
    
    await Promise.resolve()

    expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', error)
    expect(processExitSpy).toHaveBeenCalledWith(1)

    processOnSpy.mockRestore()
    processExitSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  it('should handle errors during method execution and stop the node', async () => {
    const mockArgs = {
      method: 'portal_unknownMethod',
      params: '[]',
      port: 9090,
    }
    vi.spyOn(config, 'parseArgs').mockResolvedValue(mockArgs)

    let sigintCallback: Function | null = null
    const processOnSpy = vi.spyOn(process, 'on').mockImplementation((event: string, cb: any) => {
      if (event === 'SIGINT') {
        sigintCallback = cb
      }
      return process
    })

    const processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const mainPromise = main()
    
    await vi.runAllTimersAsync()
    
    expect(mockNode.start).toHaveBeenCalled()
    expect(mockNode.enableLog).toHaveBeenCalled()

    await Promise.resolve()

    expect(mockNode.stop).toHaveBeenCalled()
    expect(processExitSpy).toHaveBeenCalledWith(1)
    
    processOnSpy.mockRestore()
    processExitSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })
})