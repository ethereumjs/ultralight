import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createWSClient, wsLink } from '@trpc/client'
import { useEffect, useReducer, useState } from 'react'
import { trpc } from './utils/trpc'
import ClientTabs from './Components/Tabs'

export function App() {
  const wsClient = createWSClient({
    url: `ws://localhost:3001`,
  })
  const [queryClient] = useState(() => new QueryClient())
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        // httpBatchLink({
        //   url: 'http://localhost:8546',
        // }),
        wsLink({
          client: wsClient,
        }),
      ],
    }),
  )

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <ClientTabs />
      </QueryClientProvider>
    </trpc.Provider>
  )
}
