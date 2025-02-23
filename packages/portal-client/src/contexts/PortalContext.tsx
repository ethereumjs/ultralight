import { 
  createContext, 
  FC,
  useContext,
  useState,
} from 'react'
import { PortalCommands } from '@/utils/commands/PortalCommands'

interface PortalContextType {
  commands: PortalCommands
}

const PortalContext = createContext<PortalContextType | null>(null)

export const PortalProvider: FC<{ children: React.ReactNode }> = ({ children }) => {
  const [commands] = useState(() => new PortalCommands())

  return (
    <PortalContext.Provider value={{ commands }}>
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
