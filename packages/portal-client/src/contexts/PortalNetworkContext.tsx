import { 
  createContext,
  useContext,
  useState,
  ReactNode,
  FC,
} from 'react'
import { createPortalClient } from '@/services/portalNetwork/client'
import { usePersistedState } from '@/hooks/usePersistedState'

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
  const [isNetworkReady, setIsNetworkReady] = usePersistedState<boolean>(
    'portal-network-ready',
    false,
  )

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
      console.error('Error initializing portal client:', err)
      throw new Error('Failed to initialize portal client')
    }
  }

  const cleanup = async () => {
    if (client) {
      try {
        await client.stop()
        setClient(null)
        setIsNetworkReady(false)
        localStorage.removeItem('portal-network-ready')
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An unknown error occurred'
        throw new Error(message)
      }
    }
  }

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
