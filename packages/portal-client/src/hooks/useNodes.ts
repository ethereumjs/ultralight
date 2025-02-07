import { useState } from 'react'
import { usePortal } from '../contexts/PortalContext'

interface UseNodesReturn {
  node: any | null
  isLoading: boolean
  error: Error | null
  sendRequestHandle: (method: string, params: any[]) => Promise<void>
}

export const useNodes = (): UseNodesReturn => {
  const { commands } = usePortal()
  const [node, setNode] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const sendRequestHandle = async (method: string, params: any[]) => {
    console.log('params inside sendrequest handle ', params)
    try {
      setIsLoading(true)
      setError(null)
      const nodeData = await commands.sendRequest({ method, params })
      setNode(nodeData)
    } catch (err) {
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }

  return { node, isLoading, error, sendRequestHandle }
}
