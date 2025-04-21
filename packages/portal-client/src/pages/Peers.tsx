import { useEffect, useState } from 'react'
import { decodeExtensionPayloadToJson, shortId } from 'portalnetwork'
import { usePortalNetwork } from '@/contexts/PortalNetworkContext'
import { PeerTable } from '@/components/ui/PeerTable'
import { PeerDetail } from '@/components/ui/PeerDetail'
import { useNotification } from '@/contexts/NotificationContext'

import { NodeId, PeerItem } from '@/utils/types'
import { IClientInfo } from 'portalnetwork'
import type { ENR } from '@chainsafe/enr'

type ExtensionPayload = {
  ClientInfo: IClientInfo
}

const Peers = () => {
  const { client, setIsLoading } = usePortalNetwork()
  const { notify } = useNotification()

  const [peers, setPeers] = useState<PeerItem[]>([])
  const [currentView, setCurrentView] = useState<'table' | 'detail'>('table')
  const [selectedNodeId, setSelectedNodeId] = useState<NodeId | null>(null)
  const [isNodeConnected, setIsNodeConnected] = useState(false)
  
  const itemsPerPage = 10
  const [currentPage, setCurrentPage] = useState(1)

 

  useEffect(() => {
    const fetchPeers = async () => {
      try {
        setIsLoading(true)
        const enrs = client.discv5.kadValues()
    
    const formattedPeers: PeerItem[] = enrs.map((enr: ENR) => {
      const nodeId = enr.nodeId    
      return {
        nodeId,
        enr,
        status: client.discv5.connectedPeers.has(nodeId) 
          ? 'Connected' 
          : 'Disconnected',
      }
    })
        
        setPeers(formattedPeers)
      } catch (error) {
        console.error('Failed to fetch peers:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPeers()
    const intervalId = setInterval(fetchPeers, 10000)
    return () => clearInterval(intervalId)
  }, [client, setIsLoading])

  const handleViewDetails = (nodeId: NodeId) => {
    setSelectedNodeId(nodeId)
    setCurrentView('detail')
    setIsNodeConnected(client.discv5.connectedPeers.has(nodeId))
  }

  const handlePingNode = async (enr: ENR) => {
    let extensionPayload: ExtensionPayload | null = null
    try {

      const pong = await client.networks.get('0x500b').sendPing(enr)
      extensionPayload = decodeExtensionPayloadToJson(
        pong.payloadType, 
        pong.customPayload,
      ) as ExtensionPayload
      notify({  
        message: `Pong received from ${extensionPayload.ClientInfo.clientName} node`,
        type: 'info',
      })
    } catch (e) {
      notify({
        message: `PING/PONG with ${shortId(enr.nodeId)} was unsuccessful`,
        type: 'error',
      })
    }
  }


  const handleReturnToTable = () => {
    setCurrentView('table')
    setSelectedNodeId(null)
  }

  const totalPages = Math.ceil(peers.length / itemsPerPage)

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Portal Network</h2>
      
      {currentView === 'table' ? (
        <PeerTable
          peers={peers}
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          totalPages={totalPages}
          onViewDetails={handleViewDetails}
          onPingNode={handlePingNode}
          onPageChange={setCurrentPage}
        />
      ) : selectedNodeId ? (
        <PeerDetail
          nodeId={selectedNodeId}
          isConnected={isNodeConnected}
          onReturn={handleReturnToTable}
        />
      ) : null}
    </div>
  )
}

export default Peers