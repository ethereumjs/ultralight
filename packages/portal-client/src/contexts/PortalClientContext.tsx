import React, { createContext, useContext, useState } from 'react'
import { createPortalClient } from '../services/portalNetwork/client'
import { usePersistedState } from '../hooks/usePersistedState'
import type { PortalNetwork } from 'portalnetwork'

interface PortalClientContextType {
  portalClient: PortalNetwork | null
  isInitialized: boolean
  initializePortalClient: (port?: number) => Promise<void>
  resetPortalClient: () => void
}

const PortalClientContext = createContext<PortalClientContextType | null>(null)

export const PortalClientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [portalClient, setPortalClient] = useState<PortalNetwork | null>(null)
  const [isInitialized, setIsInitialized] = usePersistedState('isInitialized', false)

  const initializePortalClient = async (port = 9090) => {
    if (isInitialized) {
      console.log('PortalClient is already initialized.')
      return
    }

    try {
      const client = await createPortalClient(port)

      setPortalClient(client)
      setIsInitialized(true)
 
      console.log('Connected to bootnodes:', client.discv5.kadValues().length > 0)
      console.log('Discv5 peers:', client.discv5.kadValues())
      console.log('PortalClient initialized successfully.', client)
    } catch (error) {
      console.error('Failed to initialize PortalClient:', error)
      setIsInitialized(false)
    }
  }

  const resetPortalClient = () => {
    setPortalClient(null)
    setIsInitialized(false)
    console.log('PortalClient reset.')
  }

  return (
    <PortalClientContext.Provider
      value={{
        portalClient,
        isInitialized,
        initializePortalClient,
        resetPortalClient,
      }}
    >
      {children}
    </PortalClientContext.Provider>
  )
}

export const usePortalClient = () => {
  const context = useContext(PortalClientContext)
  if (!context) {
    throw new Error('usePortalClient must be used within a PortalClientProvider')
  }
  return context
}
