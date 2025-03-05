import { createContext, useContext, useEffect, useState, ReactNode, FC } from 'react'
import { createPortalClient } from '@/services/portalNetwork/client'
// import { createDatabase } from '@/services/portalNetwork/db'
// import { TauriPortalProvider } from '@/services/portalNetwork/portalProvider'
// import { DBManager } from 'portalnetwork'

type PortalNetworkContextType = {
  client: any | null
  isLoading: boolean
  error: Error | null
  initialize: (customPort?: number) => Promise<void>
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
  port?: number
  autoInitialize?: boolean
  networkReadyTimeout?: number
}

export const PortalNetworkProvider: FC<PortalNetworkProviderProps> = ({
  children,
  port = 9090,
  autoInitialize = false,
  networkReadyTimeout = 600000,
}) => {
  const [client, setClient] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(autoInitialize)
  const [error, setError] = useState<Error | null>(null)
  const [isNetworkReady, setIsNetworkReady] = useState(false)

   const waitForNetwork = async (portalClient: any, timeout: number): Promise<boolean> => {
     console.log('Waiting for network to start...')
     setIsNetworkReady(false)

     const startTime = Date.now()

     while (Date.now() - startTime < timeout) {
       try {
         // Check if network is ready
         if (
           portalClient.network &&
           portalClient.network()['0x500b']?.routingTable &&
           portalClient.network()['0x500b']?.routingTable.values().length > 0
         ) {
           console.log('Network is ready!')
           setIsNetworkReady(true)
           return true
         }
         console.log('Waiting for network to start...')
         await new Promise((resolve) => setTimeout(resolve, 5000))
       } catch (error) {
         console.log('Error while waiting for network to start:', error)
       }
     }

     // Timeout reached
     console.warn('Network readiness timeout reached')
     return false
   }

  const initialize = async (customPort?: number): Promise<void> => {
    const portToUse = customPort ?? port

    setIsLoading(true)
    setError(null)
    setIsNetworkReady(false)

    try {
      const portalClient = await createPortalClient(portToUse)
      setClient(portalClient)
      waitForNetwork(portalClient, networkReadyTimeout)
        .catch((err) => {
          console.error('Error while waiting for network:', err)
        })
        .finally(() => {
          // We set loading to false even if network isn't ready yet
          // This allows using the client before the network is fully ready if needed
          setIsLoading(false)
        })
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
        console.log('Stopping portal client, current state:', {
          networks: client.networks ? Array.from(client.networks.keys()) : 'undefined',
          discv5: client.discv5 ? 'initialized' : 'undefined',
        })

        await client.stop()
        console.log('Portal client stopped successfully')
  
        setClient(null)
        setIsNetworkReady(false)
      } catch (err) {
        console.error('Error during portal client cleanup:', err)
      }
    }
  }

  // Auto-initialize if enabled
  useEffect(() => {
    if (autoInitialize) {
      initialize().catch((err) => {
        console.error('Auto-initialization failed:', err)
      })
    }

    return () => {
      if (client) {
        try {
          //@ts-ignore
          client.stop().catch((err) => {
            console.warn('Non-blocking error during client stop:', err)
          })
        } catch (error) {
          console.warn('Error in cleanup:', error)
        }
      }
    }
  }, [])

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
