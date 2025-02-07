import React, { useState } from 'react'
import { useNodes } from '@/hooks/useNodes'
import { hexToBytes, toHex } from 'viem'

const BlockExplorer: React.FC = () => {
  const [blockNumber, setBlockNumber] = useState('')
  const [blockHash, setBlockHash] = useState<any>('')
  const [nodeId, setNodeId] = useState('')
  const { node, isLoading, error, sendRequestHandle } = useNodes()

  const handlePortalFindNode = () => {
    const nID = toHex(nodeId)
    sendRequestHandle('portal_findNodes', [nID])
  }
  const handleGetBlockByHash = () => {
    sendRequestHandle('eth_getBlockByHash', [hexToBytes(blockHash)])
  }
  const handleGetBlockByNumber = () => {

    sendRequestHandle('eth_getBlockByNumber', [blockNumber])
  }

  return (
    <div className="w-full max-w-2xl mx-auto mt-4">
      <div>Block Explorer</div>
      <div className="space-y-4">
        <div className="flex space-x-2">
          <input
            value={blockHash}
            onChange={(e) => setBlockHash(e.target.value)}
            placeholder="Enter Block Hash"
          />
          <button onClick={handleGetBlockByHash} disabled={isLoading}>
            Block By Hash
          </button>
        </div>

        <div className="flex space-x-2">
          <input
            value={blockNumber}
            onChange={(e) => setBlockNumber(e.target.value)}
            placeholder="Enter Block Number"
          />
          <button onClick={handleGetBlockByNumber} disabled={isLoading}>
            Block By Number
          </button>
        </div>

        <div className="flex space-x-2">
          <input
            value={nodeId}
            onChange={(e) => setNodeId(e.target.value)}
            placeholder="Enter nodeId"
          />
          <button onClick={handlePortalFindNode} disabled={isLoading}>
            Get Node
          </button>
        </div>

        {isLoading && <span>Loading...</span>}
        {error && <div className="text-red-500">Error: {error.message}</div>}

        {node && (
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Node Details</h3>
            <pre className="bg-gray-600 p-4 rounded">{JSON.stringify(node, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  )
}

export default BlockExplorer
