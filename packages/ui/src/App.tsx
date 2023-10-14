import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createWSClient, wsLink } from '@trpc/client'
import { useState } from 'react'
import { trpc } from './utils/trpc'
import ClientTabs from './Components/Tabs'

export function App() {
  const wsClient = createWSClient({
    url: `ws://localhost:3001`,
    retryDelayMs(attemptIndex) {
      console.log('ws retrying', attemptIndex)
      return Math.min(1000 * 2 ** attemptIndex, 30_000)
    },
    onClose(cause) {
      clearInterval('update')
      clearInterval('updated')
      console.log('ws closed', cause)
    },
    onOpen() {
      console.log('ws opened: ws://localhost:3001')
    },

  })
  const queryClient = new QueryClient()
  const trpcClient = trpc.createClient({
    links: [
      wsLink({
        client: wsClient,
      }),
    ],
  })


  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <ClientTabs />
      </QueryClientProvider>
    </trpc.Provider>
  )
}
