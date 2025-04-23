import { shortId } from 'portalnetwork'

import { PeerItem } from '@/utils/types'
import type { ENR } from '@chainsafe/enr'

interface PeerTableProps {
  peers: PeerItem[]
  currentPage: number
  itemsPerPage: number
  totalPages: number
  onViewDetails: (peer: PeerItem) => void
  onPingNode: (enr: ENR) => void
  onPageChange: (page: number) => void
}

export const PeerTable = ({
  peers,
  currentPage,
  itemsPerPage,
  totalPages,
  onViewDetails,
  onPingNode,
  onPageChange,
}: PeerTableProps) => {
  const indexOfFirstItem = (currentPage - 1) * itemsPerPage
  const currentPeers = peers.slice(indexOfFirstItem, indexOfFirstItem + itemsPerPage)

  return (
    <>
      {peers.length === 0 ? (
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
                      onClick={() => onViewDetails(peerData)}
                    >
                      {shortId(peerData.nodeId)}
                    </td>
                    <td>
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-2 ${peerData.status === 'Connected' ? 'bg-green-500' : 'bg-red-500'}`} />
                        {peerData.status}
                      </div>
                    </td>
                    <td>
                      <button 
                        className="btn btn-sm btn-primary"
                        onClick={() => onPingNode(peerData.enr)}
                      >
                        Ping Node
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {totalPages > 1 && (
            <div className="flex justify-center mt-4 space-x-2">
              <button 
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="btn btn-sm btn-ghost"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  className={`btn btn-sm ${currentPage === page ? 'btn-primary' : 'btn-ghost'}`}
                >
                  {page}
                </button>
              ))}
              <button 
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="btn btn-sm btn-ghost"
              >
                Next
              </button>
            </div>
          )}
          
          <div className="mt-4 text-sm text-gray-500">
            Showing {indexOfFirstItem + 1}-{Math.min(indexOfFirstItem + itemsPerPage, peers.length)} of {peers.length} peers
          </div>
        </>
      )}
    </>
  )
}