import { ENR } from '@chainsafe/discv5'
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
import { HistoryNetworkContentKeyUnionType, PortalNetwork, SubNetworkIds } from 'portalnetwork'
import React, { Dispatch, SetStateAction, useState } from 'react'
import { ContentManager } from './ContentManager'

interface DevToolsProps {
  portal: PortalNetwork | undefined
  peers: ENR[]
  copy: () => Promise<void>
  enr: string
  peerEnr: string
  setPeerEnr: Dispatch<SetStateAction<string>>
  handleClick: () => Promise<void>
  native: boolean
}

export default function DevTools(props: DevToolsProps) {
  const portal = props.portal
  const peers = props.peers.map((p) => {
    return p.nodeId
  })
  const [peer, setPeer] = useState(peers[0])
  const [distance, setDistance] = useState('')
  const [contentKey, setContentKey] = useState('')
  const toast = useToast()
  const handlePing = (nodeId: string) => {
    portal?.sendPing(nodeId, SubNetworkIds.HistoryNetwork)
  }

  const handleFindNodes = (nodeId: string) => {
    portal?.sendFindNodes(
      nodeId,
      Uint16Array.from([parseInt(distance)]),
      SubNetworkIds.HistoryNetwork
    )
  }

  const handleOffer = (nodeId: string) => {
    if (contentKey.slice(0, 2) !== '0x') {
      setContentKey('')
      return
    }
    const encodedContentKey = HistoryNetworkContentKeyUnionType.serialize({
      selector: 0,
      value: { chainId: 1, blockHash: Buffer.from(contentKey.slice(2), 'hex') },
    })
    portal?.sendOffer(nodeId, [encodedContentKey], SubNetworkIds.HistoryNetwork)
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

  return (
    <VStack mt="10px">
      <Heading size="sm">Network Tools</Heading>
      <Button isDisabled={!portal} onClick={async () => handleCopy()} width={'100%'}>
        COPY ENR
      </Button>
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
            size="xs"
            bg="whiteAlpha.800"
            value={props.peerEnr}
            placeholder={'Node ENR'}
            onChange={(evt) => props.setPeerEnr(evt.target.value)}
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
        <Select>
          {peers.map((_peer, idx) => (
            <option value={_peer}>{_peer.slice(0, 25)}...</option>
          ))}
        </Select>
      </Box>
      <Divider />
      <Button isDisabled={!portal} size="sm" width="100%" onClick={() => handlePing(peer)}>
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
    </VStack>
  )
}
