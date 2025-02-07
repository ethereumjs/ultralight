import { createContext, FC, useContext, useEffect, useState } from 'react'
import { PortalCommands } from '@/utils/commands/PortalCommands'

interface PortalContextType {
  commands: PortalCommands
  isInitialized: boolean
  error: Error | null
}

const PortalContext = createContext<PortalContextType | null>(null)

export const PortalProvider: FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [commands] = useState(() => new PortalCommands())

  useEffect(() => {
    commands
      .initialize()
      .then(() => setIsInitialized(true))
      .catch((err) => setError(err))
  }, [commands])

  return (
    <PortalContext.Provider value={{ commands, isInitialized, error }}>
      {children}
    </PortalContext.Provider>
  )
}

export const usePortal = () => {
  const context = useContext(PortalContext)
  if (!context) {
    throw new Error('usePortal must be used within a PortalProvider')
  }
  return context
}
