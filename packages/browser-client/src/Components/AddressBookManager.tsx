import { Button, Heading, HStack, Input, Text, VStack, Wrap, useToast } from '@chakra-ui/react'
import debug from 'debug'
import { PortalNetwork } from 'portalnetwork'
import { HistoryNetworkContentKeyUnionType } from 'portalnetwork/dist/historySubnetwork/types'
import { SubNetworkIds } from 'portalnetwork/dist/wire'
import { randUint16 } from 'portalnetwork/dist/wire/utp'
import React from 'react'
import { toHexString } from './ShowInfo'

type NodeManagerProps = {
  portal: PortalNetwork
  network: SubNetworkIds
}

const AddressBookManager: React.FC<NodeManagerProps> = ({ portal, network }) => {
  const [enr, setEnr] = React.useState<string>('')
  const [peers, setPeers] = React.useState<string[]>([])
  const [contentKey, setContentKey] = React.useState<string>('')
  const [distance, setDistance] = React.useState<string>('0')
  const toast = useToast()

  React.useEffect(() => {
    portal.client.on('enrAdded', () => {
      const peerENRs = portal.client.kadValues()
      const newPeers = peerENRs.map((peer) => peer.nodeId)
      setPeers(newPeers)
    })
  }, [])

  const log = debug('discv5:service')

  const handleClick = () => {
    if (enr) {
      portal.client.addEnr(enr)
      setEnr('')
      const peerENRs = portal.client.kadValues()
      const newPeers = peerENRs.map((peer) => peer.nodeId)
      setPeers(newPeers)
    }
  }

  const handlePing = (nodeId: string) => {
    portal.sendPing(nodeId, network)
  }

  const handleFindNodes = (nodeId: string) => {
    portal.sendFindNodes(nodeId, Uint16Array.from([parseInt(distance)]), network)
  }

  const handleFindContent = async (nodeId: string) => {
    if (contentKey.slice(0, 2) !== '0x') {
      setContentKey('')
      toast({
        title: 'Error',
        description: 'Block Hash must be hex prefixed string',
        status: 'error',
        duration: 3000,
      })
      return
    }
    const encodedContentKey = HistoryNetworkContentKeyUnionType.serialize({
      selector: 0,
      value: { chainId: 1, blockHash: Buffer.from(contentKey.slice(2), 'hex') },
    })
    const res = await portal.sendFindContent(nodeId, encodedContentKey, network)
    res instanceof Uint8Array &&
      toast({
        title: 'Found what we were looking for',
        description: toHexString(res),
        status: 'success',
        duration: 3000,
      })
  }

  const handleOffer = (nodeId: string) => {
    if (contentKey.slice(0, 2) !== '0x') {
      setContentKey('')
      toast({
        title: 'Error',
        description: 'Block Hash must be hex prefixed string',
        status: 'error',
        duration: 3000,
      })
      return
    }
    const encodedContentKey = HistoryNetworkContentKeyUnionType.serialize({
      selector: 0,
      value: { chainId: 1, blockHash: Buffer.from(contentKey.slice(2), 'hex') },
    })
    portal.sendOffer(nodeId, [encodedContentKey], network)
  }

  const handleUtpStream = (nodeId: string) => {
    portal.sendUtpStreamRequest(nodeId, randUint16())
  }

  const nodeLookup = () => {
    log('discv5:service Starting a new lookup...')

    portal.client.findRandomNode().then((res) => {
      log(`finished. ${res.length} found`)
    })
  }

  return (
    <VStack paddingTop={2}>
      <Heading size="lg">Address Book Manager</Heading>
      <Input value={enr} placeholder={'Node ENR'} onChange={(evt) => setEnr(evt.target.value)} />
      <HStack>
        <Button onClick={handleClick}>Add Node</Button>
        <Button onClick={() => nodeLookup()}> Start Random Node Lookup</Button>
      </HStack>

      {peers.length > 0 && (
        <>
          <Input
            placeholder={'Block Hash'}
            onChange={(evt) => {
              setContentKey(evt.target.value)
            }}
          />
          <Input
            placeholder={'Distance'}
            onChange={(evt) => {
              setDistance(evt.target.value)
            }}
          />
        </>
      )}

      {peers.length > 0 &&
        peers.map((peer) => (
          <HStack key={Math.random().toString()}>
            <Text>{peer.slice(10)}...</Text>
            <Wrap spacing="5px">
              <Button onClick={() => handlePing(peer)}>Send Ping</Button>
              <Button onClick={() => handleFindNodes(peer)}>Request Nodes from Peer</Button>
              <Button onClick={() => handleFindContent(peer)}>Send Find Content Request</Button>
              <Button onClick={() => handleOffer(peer)}>Send Offer</Button>
              <Button onClick={() => handleUtpStream(peer)}>Start uTP Stream</Button>
            </Wrap>
          </HStack>
        ))}
    </VStack>
  )
}

export default AddressBookManager
