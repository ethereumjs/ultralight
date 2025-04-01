import { createContext, useContext, useEffect, useState, ReactNode, FC } from 'react'
import { createPortalClient } from '@/services/portalNetwork/client'
import { getConfigValue } from '@/utils/helpers'
import { ConfigId } from '@/utils/types'

type PortalNetworkContextType = {
  client: any | null
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
  initialize: (customPort: number) => Promise<void>
  isNetworkReady: boolean
  cleanup: () => Promise<void>
}

const PortalNetworkContext = createContext<PortalNetworkContextType>({
  client: null,
  isLoading: true,
  setIsLoading: () => {},
  isNetworkReady: false,
  initialize: async () => {},
  cleanup: async () => {},
})

type PortalNetworkProviderProps = {
  children: ReactNode
  networkReadyTimeout?: number
}

export const PortalNetworkProvider: FC<PortalNetworkProviderProps> = ({
  children,
}) => {
  const [client, setClient] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isNetworkReady, setIsNetworkReady] = useState(false)

  const udpPort = getConfigValue(ConfigId.UdpPort)
  const shouldAutoInitialize = false

  const initialize = async (port: number): Promise<void> => {

    setIsLoading(true)
    setIsNetworkReady(false)

    try {
      const portalClient = await createPortalClient(port)
      setClient(portalClient)
      setIsLoading(false)
      setIsNetworkReady(true)
    } catch (err) {
      setIsLoading(false)
      setIsNetworkReady(false)
      throw new Error('Failed to initialize portal client')
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
        const message = err instanceof Error ? err.message : 'An unknown error occurred'
        throw new Error(message)    
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

  const contextValue: PortalNetworkContextType = {
    client,
    isLoading,
    setIsLoading,
    isNetworkReady,
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
