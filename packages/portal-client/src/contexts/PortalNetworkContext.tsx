import { 
  createContext,
  useContext,
  useState,
  ReactNode,
  FC,
  useRef,
} from 'react'
import { createPortalClient } from '@/services/portalNetwork/client'
import { usePersistedState } from '@/hooks/usePersistedState'

import { 
  NetworkId,
  type HistoryNetwork, 
  type PortalNetwork, 
  type StateNetwork,
 } from 'portalnetwork'

type PortalNetworkContextType = {
  client: PortalNetwork | undefined
  historyNetwork: HistoryNetwork | undefined
  stateNetwork: StateNetwork | undefined
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
  initialize: (customPort: number) => Promise<void>
  isNetworkReady: boolean
  cleanup: () => Promise<void>
  abortController: AbortController | null
  createAbortController: () => AbortController
  cancelRequest: () => void
}

const PortalNetworkContext = createContext<PortalNetworkContextType>({
  client: undefined,
  historyNetwork: undefined,
  stateNetwork: undefined,
  isLoading: true,
  setIsLoading: () => {},
  isNetworkReady: false,
  initialize: async () => {},
  cleanup: async () => {},
  abortController: null,
  createAbortController: () => new AbortController(),
  cancelRequest: () => {},
})

type PortalNetworkProviderProps = {
  children: ReactNode
  networkReadyTimeout?: number
}

export const PortalNetworkProvider: FC<PortalNetworkProviderProps> = ({
  children,
}) => {
  const abortControllerRef = useRef<AbortController | null>(null)
  const [client, setClient] = useState<PortalNetwork | undefined>(undefined)
  const [historyNetwork, setHistoryNetwork] = useState<HistoryNetwork | undefined>(undefined)
  const [stateNetwork, setStateNetwork] = useState<StateNetwork | undefined>(undefined)
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
      setHistoryNetwork(portalClient.network()[NetworkId.HistoryNetwork])
      setStateNetwork(portalClient.network()[NetworkId.StateNetwork])
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
        setClient(undefined)
        setHistoryNetwork(undefined)
        setStateNetwork(undefined)
        setIsNetworkReady(false)
        localStorage.removeItem('portal-network-ready')
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An unknown error occurred'
        throw new Error(message)
      }
    }
  }

   const createAbortController = () => {
     if (abortControllerRef.current) {
       abortControllerRef.current.abort()
     }

     const controller = new AbortController()
     abortControllerRef.current = controller
     return controller
   }

   const cancelRequest = () => {
     if (abortControllerRef.current) {
       abortControllerRef.current.abort('Request cancelled by user')
       abortControllerRef.current = null
     }
   }

  const contextValue: PortalNetworkContextType = {
    client,
    historyNetwork,
    stateNetwork,
    isLoading,
    setIsLoading,
    isNetworkReady,
    initialize,
    cleanup,
    abortController: abortControllerRef.current,
    createAbortController,
    cancelRequest,
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
