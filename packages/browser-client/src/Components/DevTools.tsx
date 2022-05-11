import {
  Input,
  Heading,
  Button,
  Box,
  VStack,
  Divider,
  Center,
  useToast,
  Select,
} from '@chakra-ui/react'
import { SubprotocolIds, ENR, fromHexString } from 'portalnetwork'
import React, { Dispatch, SetStateAction, useContext, useState } from 'react'
import { ContentManager } from './ContentManager'
import { Share } from '@capacitor/share'
import { PortalContext } from '../App'

interface DevToolsProps {
  peers: ENR[]
  copy: () => Promise<void>
  enr: string
  peerEnr: string
  setPeerEnr: Dispatch<SetStateAction<string>>
  handleClick: () => Promise<void>
  native: boolean
}

export default function DevTools(props: DevToolsProps) {
  const portal = useContext(PortalContext)
  const [canShare, setCanShare] = useState(false)
  const peers = props.peers.map((p) => {
    return p.nodeId
  })
  const [peer, _setPeer] = useState(peers[0])
  const [targetNodeId, setTarget] = useState('')
  const [distance, setDistance] = useState('')
  const [contentKey, setContentKey] = useState('')
  const toast = useToast()
  const handlePing = () => {
    portal.sendPing(peer, SubprotocolIds.HistoryNetwork)
  }
  async function share() {
    await Share.share({
      title: `Ultralight ENR`,
      text: props.enr,
      dialogTitle: `Share ENR`,
    })
  }

  const handleFindNodes = (nodeId: string) => {
    portal.sendFindNodes(nodeId, [parseInt(distance)], SubprotocolIds.HistoryNetwork)
  }

  const handleOffer = (nodeId: string) => {
    if (contentKey.slice(0, 2) !== '0x') {
      setContentKey('')
      toast({
        title: 'Invalid content key',
        description: 'Key must be hex prefixed',
        status: 'warning',
      })
      return
    }

    portal.sendOffer(nodeId, [fromHexString(contentKey)], SubprotocolIds.HistoryNetwork)
  }

  const sendRendezvous = async (peer: string) => {
    portal.sendRendezvous(targetNodeId, peer, SubprotocolIds.HistoryNetwork)
    setTarget('')
  }
  async function handleCopy() {
    await props.copy()
    toast({
      title: `ENR copied`,
      status: 'success',
      duration: 1500,
      isClosable: true,
      position: 'bottom-right',
      variant: 'solid',
    })
  }

  async function sharing() {
    const s = await Share.canShare()
    setCanShare(s.value)
  }

  React.useEffect(() => {
    sharing()
  }, [])

  return (
    <VStack>
      {canShare ? (
        <Button width={`100%`} onClick={share}>
          SHARE ENR
        </Button>
      ) : (
        <Button onClick={async () => handleCopy()} width={'100%'}>
          COPY ENR
        </Button>
      )}
      <ContentManager portal={portal} />

      {props.native ? (
        <Center>
          <VStack>
            <Button
              isDisabled={!props.peerEnr.startsWith('enr:')}
              width={'100%'}
              onClick={props.handleClick}
            >
              Connect To Node
            </Button>
            <Input
              width={'100%'}
              bg="whiteAlpha.800"
              value={props.peerEnr}
              placeholder={'Node ENR'}
              onChange={(evt) => props.setPeerEnr(evt.target.value)}
            />
          </VStack>
        </Center>
      ) : (
        <VStack width={'100%'} spacing={0} border="1px" borderRadius={'0.375rem'}>
          <Input
            size="sm"
            bg="whiteAlpha.800"
            value={props.peerEnr}
            placeholder="Node ENR"
            onChange={(evt) => props.setPeerEnr(evt.target.value)}
            mb={2}
          />
          <Button width={'100%'} onClick={props.handleClick}>
            Connect To Node
          </Button>
        </VStack>
      )}
      <Divider />
      <Heading size="sm">Peer Tools</Heading>
      <Box w="100%">
        <Center>
          <Heading size="xs">
            Select Peer ({peers.indexOf(peer) + 1}/{peers.length})
          </Heading>
        </Center>
        <Divider />
        <Select value={peer} onChange={(evt) => _setPeer(evt.target.value)}>
          {peers.map((_peer) => (
            <option key={_peer} value={_peer}>
              {_peer.slice(0, 25)}...
            </option>
          ))}
        </Select>
      </Box>
      <Divider />
      <Button isDisabled={!portal} size="sm" width="100%" onClick={() => handlePing()}>
        Send Ping
      </Button>
      <Divider />
      <Input
        placeholder={'Distance'}
        onChange={(evt) => {
          setDistance(evt.target.value)
        }}
      />
      <Button isDisabled={!portal} size="sm" width="100%" onClick={() => handleFindNodes(peer)}>
        Request Nodes from Peer
      </Button>
      <Divider />
      <Input
        value={contentKey}
        placeholder="Content Key"
        onChange={(evt) => setContentKey(evt.target.value)}
      />
      <Button isDisabled={!portal} width={'100%'} size="sm" onClick={() => handleOffer(peer)}>
        Send Offer
      </Button>
      <Divider />
      <Input
        placeholder="Target Node ID"
        value={targetNodeId}
        onChange={(evt) => setTarget(evt.target.value)}
      />
      <Button isDisabled={!targetNodeId} onClick={() => sendRendezvous(peer)} w="100%" size="sm">
        Send Rendezvous Request
      </Button>
    </VStack>
  )
}
