import BlockExplorer from '../jsonrpc/BlockExplorer'
import { CopyableShortId } from '../common/CopyableShortId'

import { PeerItem } from '@/utils/types'

interface PeerDetailProps {
  peer: PeerItem
  isConnected: boolean
  onReturn: () => void
}

export const PeerDetail = ({
  peer,
  isConnected,
  onReturn,

}: PeerDetailProps) => {
  
  return (
    <div className="bg-base-100 rounded-lg border border-base-content/5 p-6">
      <div className="flex justify-between items-center mb-4 px-6">
        <button 
          onClick={onReturn}
          className="btn btn-sm btn-outline"
        >
          Back to Table
        </button>
        <div className="flex items-start p-2">
          <div className="flex-1 text-left">
            <CopyableShortId 
              value={peer.nodeId} 
              displayPrefix="NodeId: 0x"
            />
            <div className="mt-1">
              <CopyableShortId 
                value={peer.enr.encodeTxt()} 
              />
            </div>
          </div>
          <div className={`w-3 h-3 ml-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        </div> 
      </div>
      <BlockExplorer />
    </div>
  )
}