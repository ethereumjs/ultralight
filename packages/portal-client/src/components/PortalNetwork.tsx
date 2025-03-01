import { useEffect, useState } from 'react'
import { createPortalClient } from '../services/portalNetwork/client'

function App() {
  const [portalClient, setPortalClient] = useState<any | null>(null)

  useEffect(() => {
    async function initialize() {
      try {
        const client = await createPortalClient()
        setPortalClient(client)
      } catch (error) {
        console.error('Failed to initialize portal client:', error)
      }
    }

    initialize()
  }, [])

  if (!portalClient) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <h1>Portal Network Client</h1>
      {/* Render your UI here */}
    </div>
  )
}

export default App

// import React, { useState } from 'react'
// import { usePortalClient } from '../hooks/usePortalClient'

// // The main application component
// export function PortalApp() {
//   const [blockNumber, setBlockNumber] = useState<string>('')
//   const [blockData, setBlockData] = useState<any>(null)
//   const [isLoading, setIsLoading] = useState<boolean>(false)

//   // Initialize the Portal Network client
//   const { client, status, error } = usePortalClient()

//   // Handle form submission to fetch a block
//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault()

//     if (!client || status !== 'ready') {
//       return
//     }

//     setIsLoading(true)
//     setBlockData(null)

//     try {
//       // Convert block number to hex if it's a number
//       const blockHex = !isNaN(Number(blockNumber))
//         ? '0x' + Number(blockNumber).toString(16)
//         : blockNumber

//       // Fetch the block data
//       const block = await client.ETH.getBlockByNumber(blockHex)
//       setBlockData(block)
//     } catch (err) {
//       console.error('Failed to fetch block:', err)
//       // Handle error appropriately
//     } finally {
//       setIsLoading(false)
//     }
//   }

//   return (
//     <div className="portal-app">
//       <header>
//         <h1>Portal Network Client</h1>
//         <div className="status">
//           Status:{' '}
//           {status === 'ready' ? 'Connected' : status === 'error' ? 'Error' : 'Connecting...'}
//         </div>
//       </header>

//       <main>
//         {error && (
//           <div className="error-panel">
//             <h3>Error connecting to Portal Network</h3>
//             <p>{error.message}</p>
//           </div>
//         )}

//         <form onSubmit={handleSubmit}>
//           <div className="form-group">
//             <label htmlFor="blockNumber">Block Number or Hash:</label>
//             <input
//               type="text"
//               id="blockNumber"
//               value={blockNumber}
//               onChange={(e) => setBlockNumber(e.target.value)}
//               placeholder="Enter block number or hash"
//               disabled={status !== 'ready' || isLoading}
//             />
//           </div>

//           <button type="submit" disabled={status !== 'ready' || !blockNumber || isLoading}>
//             {isLoading ? 'Loading...' : 'Get Block'}
//           </button>
//         </form>

//         {blockData && (
//           <div className="block-data">
//             <h2>Block Data</h2>
//             <pre>{JSON.stringify(blockData, null, 2)}</pre>
//           </div>
//         )}
//       </main>
//     </div>
//   )
// }

// export default PortalApp
