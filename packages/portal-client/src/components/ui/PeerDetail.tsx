
import BlockExplorer from "../jsonrpc/BlockExplorer";


interface PeerDetailProps {
  nodeId: string;
  isConnected: boolean;
  onReturn: () => void;
}

export const PeerDetail = ({
  nodeId,
  isConnected,
  onReturn,

}: PeerDetailProps) => {
  return (
    <div className="bg-base-100 rounded-lg border border-base-content/5 p-6">
      <div className="flex justify-between items-center mb-4">
        <button 
          onClick={onReturn}
          className="btn btn-sm btn-outline"
        >
          Back to Table
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Node ID</h3>
          <div className="bg-base-200 p-3 rounded font-mono text-sm break-all">
            {nodeId}
          </div>
        </div>
        
        <div>
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} mr-2`}></div>
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>
      </div>
      <BlockExplorer />
    </div>
  );
};