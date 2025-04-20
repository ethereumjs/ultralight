
import { shortId } from "portalnetwork";
import BlockExplorer from "../jsonrpc/BlockExplorer";


interface PeerDetailProps {
  nodeId: string
  isConnected: boolean
  onReturn: () => void
}

export const PeerDetail = ({
  nodeId,
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
        <div className="flex items-center">
          <span className="mx-2">NodeId: 0x{shortId(nodeId)}</span>
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} mr-2`} />
        </div>
      </div>
      <BlockExplorer nodeId={nodeId} />
    </div>
  )
}