import { createContext, useContext, useEffect, useState, ReactNode, FC } from 'react'
import { createPortalClient } from '@/services/portalNetwork/client'
import { getConfigValue } from '@/utils/helpers'
import { ConfigId } from '@/utils/types'

type PortalNetworkContextType = {
  client: any | null
  isLoading: boolean
  error: Error | null
  initialize: (customPort: number, proxyAddress: string) => Promise<void>
  isNetworkReady: boolean
  cleanup: () => Promise<void>
}

const PortalNetworkContext = createContext<PortalNetworkContextType>({
  client: null,
  isLoading: true,
  isNetworkReady: false,
  error: null,
  initialize: async () => {},
  cleanup: async () => {},
})

type PortalNetworkProviderProps = {
  children: ReactNode
  networkReadyTimeout?: number
}

export const PortalNetworkProvider: FC<PortalNetworkProviderProps> = ({
  children,
  // networkReadyTimeout = 600000,
}) => {
  const [client, setClient] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [isNetworkReady, setIsNetworkReady] = useState(false)

  const udpPort = getConfigValue(ConfigId.UdpPort)
  const shouldAutoInitialize = false

  //  const waitForNetwork = async (portalClient: any, timeout: number): Promise<boolean> => {
  //    console.log('Waiting for network to start...')
  //    setIsNetworkReady(false)

  //    const startTime = Date.now()

  //    while (Date.now() - startTime < timeout) {
  //      try {
  //        // Check if network is ready
  //        if (
  //          portalClient.network &&
  //          portalClient.network()['0x500b']?.routingTable &&
  //          portalClient.network()['0x500b']?.routingTable.values().length > 0
  //        ) {
  //          console.log('Network is ready!')
  //          setIsNetworkReady(true)
  //          return true
  //        }
  //        console.log('Waiting for network to start...')
  //        await new Promise((resolve) => setTimeout(resolve, 5000))
  //      } catch (error) {
  //        console.log('Error while waiting for network to start:', error)
  //      }
  //    }

  //    console.warn('Network readiness timeout reached')
  //    return false
  //  }

  const initialize = async (port: number): Promise<void> => {

    setIsLoading(true)
    setError(null)
    setIsNetworkReady(false)

    try {
      const portalClient = await createPortalClient(port)
      setClient(portalClient)
      // waitForNetwork(portalClient, networkReadyTimeout)
      //   .catch((err) => {
      //     console.error('Error while waiting for network:', err)
      //   })
      //   .finally(() => {
          setIsLoading(false)
          setIsNetworkReady(true)
      //   })
    } catch (err) {
      console.error('Failed to initialize portal client:', err)
      setError(err instanceof Error ? err : new Error(String(err)))
      setIsLoading(false)
      setIsNetworkReady(false)
      throw err
    }
  }

  const cleanup = async () => {
    if (client) {
      try {
        await client.stop()
        console.log('Portal client stopped successfully')
  
        setClient(null)
        setIsNetworkReady(false)
      } catch (err) {
        console.error('Error during portal client cleanup:', err)
      }
    }
  }

   useEffect(() => {
    if (shouldAutoInitialize) {
      initialize(Number(udpPort)).catch((err) => {
        console.error('Auto-initialization failed:', err);
      });
    }
  }, [shouldAutoInitialize, udpPort])

  // useEffect(() => {
  //   if (autoInitialize) {
  //     initialize().catch((err) => {
  //       console.error('Auto-initialization failed:', err)
  //     })
  //   }

  //   return () => {
  //     if (client) {
  //       try {
  //         //@ts-ignore
  //         client.stop().catch((err) => {
  //           console.warn('Non-blocking error during client stop:', err)
  //         })
  //       } catch (error) {
  //         console.warn('Error in cleanup:', error)
  //       }
  //     }
  //   }
  // }, [])

  const contextValue: PortalNetworkContextType = {
    client,
    isLoading,
    isNetworkReady,
    error,
    initialize,
    cleanup,
  }

  return (
    <PortalNetworkContext.Provider value={contextValue}>{children}</PortalNetworkContext.Provider>
  )
}

export const usePortalNetwork = () => {
  const context = useContext(PortalNetworkContext)

  if (context === undefined) {
    throw new Error('usePortalNetwork must be used within a PortalNetworkProvider')
  }

  return context
}
