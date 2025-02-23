import { usePortal } from '@/contexts/PortalContext'
import { usePersistedState } from './usePersistedState'

const useInitializeApp = () => {
  const [isInitialized, setIsInitialized] = usePersistedState('isInitialized', false)
  const { commands } = usePortal()

  const handleInitialize = async () => {
    if (isInitialized) {
      await commands.shutdown()
      setIsInitialized(false)
    } else {
      await commands.initialize()
      setIsInitialized(true)
    }
  }

  return {
    isInitialized,
    handleInitialize,
  }
}

export default useInitializeApp