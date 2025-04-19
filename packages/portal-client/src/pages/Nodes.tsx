import { useEffect, useState, FC } from "react";
import { usePortalNetwork } from "@/contexts/PortalNetworkContext";
import { methodRegistry, MethodType } from '@/utils/rpcMethods'
import { APPROVED_METHODS } from '@/utils/constants/methodRegistry'
import Select from "@/components/ui/Select";
import { useJsonRpc } from "@/hooks/useJsonRpc";
import { useNotification } from "@/contexts/NotificationContext";
import { MethodInput } from "@/components/ui/MethodInput";

// Define types based on actual structure
type NodeId = string;
interface PeerItem {
  nodeId: NodeId;
  timeoutId: NodeJS.Timeout;
  status: "Connected" | "Disconnected";
}

const Nodes = () => {
  const { client, isLoading, setIsLoading  } = usePortalNetwork();
  const { setResult, sendRequestHandle } = useJsonRpc()
  const { notify } = useNotification()
  const [peers, setPeers] = useState<PeerItem[]>([]);
  const [currentView, setCurrentView] = useState<"table" | "detail">("table");
  const [selectedNodeId, setSelectedNodeId] = useState<NodeId | null>(null);
  const [isNodeConnected, setIsNodeConnected] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [selectedMethod, setSelectedMethod] = useState<MethodType | ''>('')
  const [inputValue, setInputValue] = useState("");
  const [methodResult, setMethodResult] = useState<any>(null);

  const methodOptions = APPROVED_METHODS.map((method) => ({
      value: method,
      label: methodRegistry[method].name,
    }))

  useEffect(() => {
    const fetchPeers = async () => {
      try {
        setIsLoading(true);
        // Get connected peers from the client
        const peerEntries: Array<[NodeId, NodeJS.Timeout]> = Array.from(
          client.discv5.connectedPeers.entries()
        );
        
        const formattedPeers: PeerItem[] = peerEntries.map(([nodeId, timeoutId]) => ({
          nodeId,
          timeoutId,
          status: "Connected",
        }));
        
        setPeers(formattedPeers);
      } catch (error) {
        console.error("Failed to fetch peers:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPeers();
    
    const intervalId = setInterval(fetchPeers, 10000);
    return () => clearInterval(intervalId);
  }, [client]);

  // Calculate pagination values
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPeers = peers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(peers.length / itemsPerPage);

  const handleViewDetails = (nodeId: NodeId) => {
    setSelectedNodeId(nodeId);
    setCurrentView("detail");
    
    // Check if node is connected
    const isConnected = client.discv5.connectedPeers.has(nodeId);
    setIsNodeConnected(isConnected);
  };

  const handlePingNode = (nodeId: NodeId) => {
    // Implement ping logic
    console.log(`Pinging node: ${nodeId}`);
  };

  const handleSelectMethod = (method: MethodType) => {
    setSelectedMethod(method)
    reset()
  }

  const reset = () => {
    setInputValue('')
    setResult(null)
    setIsLoading(false)
  }

  const handleSubmit = async () => {
    if (selectedMethod && methodRegistry[selectedMethod]) {
      try {
        let formattedInput = inputValue

       
        await methodRegistry[selectedMethod].handler(formattedInput, sendRequestHandle)
      } catch (err) {
        notify({
          message: err instanceof Error ? err.message : 'Request failed',
          type: 'error',
        })
      }
    }
  }

  const handleReturnToTable = () => {
    setCurrentView("table");
    setSelectedNodeId(null);
    setMethodResult(null);
    setInputValue("");
  };

  const goToPage = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const renderPagination = () => {
    const pageNumbers = [];
    
    for (let i = 1; i <= totalPages; i++) {
      pageNumbers.push(
        <button
          key={i}
          onClick={() => goToPage(i)}
          className={`btn btn-sm ${currentPage === i ? 'btn-primary' : 'btn-ghost'}`}
        >
          {i}
        </button>
      );
    }
    
    return (
      <div className="flex justify-center mt-4 space-x-2">
        <button 
          onClick={() => goToPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="btn btn-sm btn-ghost"
        >
          Previous
        </button>
        {pageNumbers}
        <button 
          onClick={() => goToPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="btn btn-sm btn-ghost"
        >
          Next
        </button>
      </div>
    );
  };

  // Table View Component
  const TableView = () => (
    <>
      {isLoading ? (
        <div className="flex justify-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : peers.length === 0 ? (
        <div className="text-center p-4 bg-base-200 rounded-lg">
          No connected peers found
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-box border border-base-content/5 bg-base-100">
            <table className="table">
              <thead>
                <tr>
                  <th className="w-12">No.</th>
                  <th>Node ID</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentPeers.map((peerData, index) => (
                  <tr key={peerData.nodeId} className="hover:bg-base-200">
                    <td>{indexOfFirstItem + index + 1}</td>
                    <td 
                      className="font-mono text-sm cursor-pointer text-blue-500 hover:underline"
                      onClick={() => handleViewDetails(peerData.nodeId)}
                    >
                      {peerData.nodeId.substring(0, 10)}...{peerData.nodeId.substring(peerData.nodeId.length - 8)}
                    </td>
                    <td>
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                        {peerData.status}
                      </div>
                    </td>
                    <td>
                      <button 
                        className="btn btn-sm btn-primary"
                        onClick={() => handlePingNode(peerData.nodeId)}
                      >
                        Ping Node
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {totalPages > 1 && renderPagination()}
          
          <div className="mt-4 text-sm text-gray-500">
            Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, peers.length)} of {peers.length} peers
          </div>
        </>
      )}
    </>
  );

  // Detail View Component
  const DetailView = () => {
    if (!selectedNodeId) return null;

    return (
      <div className="bg-base-100 rounded-lg border border-base-content/5 p-6">
        <div className="flex justify-between items-center mb-4">
          <button 
            onClick={handleReturnToTable}
            className="btn btn-sm btn-outline"
          >
            Back to Table
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Node ID</h3>
            <div className="bg-base-200 p-3 rounded font-mono text-sm break-all">
              {selectedNodeId}
            </div>
          </div>
          
          <div>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full ${isNodeConnected ? 'bg-green-500' : 'bg-red-500'} mr-2`}></div>
              <span>{isNodeConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
          </div>
        </div>
        
        <div className="mb-6">
          
          <div className="bg-base-200 p-4 rounded-lg">
            <div className="mb-4">
              <Select
            options={methodOptions}
            value={selectedMethod}
            onChange={(e) => handleSelectMethod(e.target.value as MethodType)}
            placeholder="Select a method"
          />
            
            </div>
            
            <div className="mb-4">
              <MethodInput
                value={inputValue}
                onChange={setInputValue}
                placeholder={methodRegistry.portal_findContent.paramPlaceholder}
                onSubmit={handleSubmit}
                onCancel={() => setInputValue("")}
                isLoading={isLoading}
                className="bg-[#2A323C] text-gray-200 border border-gray-600 placeholder-gray-400 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500 w-full"
              />
            </div>
          </div>
        </div>
        
        {methodResult && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Result</h3>
            <div className="bg-base-200 p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm font-mono">
                {JSON.stringify(methodResult, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Portal Network</h2>
      
      {currentView === "table" ? <TableView /> : <DetailView />}
    </div>
  );
};

export default Nodes;





// import { useEffect, useState } from "react";
// import { usePortalNetwork } from "@/contexts/PortalNetworkContext";
// import { useNavigate } from "react-router-dom";

// // Define types based on actual structure
// type NodeId = string;
// interface PeerItem {
//   nodeId: NodeId;
//   timeoutId: NodeJS.Timeout;
//   // Add any additional derived properties
//   status: "Connected" | "Disconnected";
// }

// const Nodes = () => {
//   const { client } = usePortalNetwork();
//   const [peers, setPeers] = useState<PeerItem[]>([]);
//   const [loading, setLoading] = useState(true);
//   const navigate = useNavigate();
  
//   // Pagination state
//   const [currentPage, setCurrentPage] = useState(1);
//   const itemsPerPage = 10; // Show 10 items per page

//   useEffect(() => {
//     const fetchPeers = async () => {
//       try {
//         setLoading(true);
//         // Get connected peers from the client
//         const peerEntries: Array<[NodeId, NodeJS.Timeout]> = Array.from(
//           client.discv5.connectedPeers.entries()
//         );
        
//         // Transform the entries into a more usable format
//         const formattedPeers: PeerItem[] = peerEntries.map(([nodeId, timeoutId]) => ({
//           nodeId,
//           timeoutId,
//           status: "Connected", // Since they're in connectedPeers, they're connected
//         }));
        
//         setPeers(formattedPeers);
//       } catch (error) {
//         console.error("Failed to fetch peers:", error);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchPeers();
    
//     // Optional: Set up a periodic refresh
//     const intervalId = setInterval(fetchPeers, 10000); // Refresh every 10 seconds
    
//     return () => clearInterval(intervalId);
//   }, [client]);

//   // Calculate pagination values
//   const indexOfLastItem = currentPage * itemsPerPage;
//   const indexOfFirstItem = indexOfLastItem - itemsPerPage;
//   const currentPeers = peers.slice(indexOfFirstItem, indexOfLastItem);
//   const totalPages = Math.ceil(peers.length / itemsPerPage);

//   const handleViewDetails = (nodeId: NodeId) => {
//     navigate(`/nodes/${nodeId}`);
//   };

//   const goToPage = (pageNumber: number) => {
//     setCurrentPage(pageNumber);
//   };

//   const renderPagination = () => {
//     const pageNumbers = [];
    
//     // Create page buttons
//     for (let i = 1; i <= totalPages; i++) {
//       pageNumbers.push(
//         <button
//           key={i}
//           onClick={() => goToPage(i)}
//           className={`btn btn-sm ${currentPage === i ? 'btn-primary' : 'btn-ghost'}`}
//         >
//           {i}
//         </button>
//       );
//     }
    
//     return (
//       <div className="flex justify-center mt-4 space-x-2">
//         <button 
//           onClick={() => goToPage(Math.max(1, currentPage - 1))}
//           disabled={currentPage === 1}
//           className="btn btn-sm btn-ghost"
//         >
//           Previous
//         </button>
//         {pageNumbers}
//         <button 
//           onClick={() => goToPage(Math.min(totalPages, currentPage + 1))}
//           disabled={currentPage === totalPages}
//           className="btn btn-sm btn-ghost"
//         >
//           Next
//         </button>
//       </div>
//     );
//   };

//   return (
//     <div className="p-4">
//       <h2 className="text-2xl font-bold mb-4">Connected Peers</h2>
      
//       {loading ? (
//         <div className="flex justify-center p-4">
//           <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
//         </div>
//       ) : peers.length === 0 ? (
//         <div className="text-center p-4 bg-base-200 rounded-lg">
//           No connected peers found
//         </div>
//       ) : (
//         <>
//           <div className="overflow-x-auto rounded-box border border-base-content/5 bg-base-100">
//             <table className="table">
//               <thead>
//                 <tr>
//                   <th className="w-12">No.</th>
//                   <th>Node ID</th>
//                   <th>Status</th>
//                   <th>Actions</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {currentPeers.map((peerData, index) => (
//                   <tr key={peerData.nodeId} className="hover:bg-base-200">
//                     <td>{indexOfFirstItem + index + 1}</td>
//                     <td className="font-mono text-sm">
//                       {peerData.nodeId.substring(0, 10)}...{peerData.nodeId.substring(peerData.nodeId.length - 8)}
//                     </td>
//                     <td>
//                       <div className="flex items-center">
//                         <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
//                         {peerData.status}
//                       </div>
//                     </td>
//                     <td>
//                       <button 
//                         className="btn btn-sm btn-primary"
//                         onClick={() => handleViewDetails(peerData.nodeId)}
//                       >
//                         View Details
//                       </button>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
          
//           {/* Pagination controls */}
//           {totalPages > 1 && renderPagination()}
          
//           <div className="mt-4 text-sm text-gray-500">
//             Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, peers.length)} of {peers.length} peers
//           </div>
//         </>
//       )}
//     </div>
//   );
// };

// export default Nodes;
