import {
  Button,
  Heading,
  Input,
  VStack,
  useToast,
  Grid,
  GridItem,
  MenuOptionGroup,
  Menu,
  MenuItemOption,
} from '@chakra-ui/react'
import { PortalNetwork, SubNetworkIds, NodeLookup } from 'portalnetwork'
import { generateRandomNodeIdAtDistance } from 'portalnetwork/dist/util'
import { HistoryNetworkContentKeyUnionType } from 'portalnetwork/dist/historySubnetwork/types'
import React, { useEffect, useState } from 'react'

type NodeManagerProps = {
  portal: PortalNetwork
  network: SubNetworkIds
  finding: string | undefined
}

const AddressBookManager: React.FC<NodeManagerProps> = ({ portal, network, finding }) => {
  const [enr, setEnr] = React.useState<string>('')
  const [peers, setPeers] = React.useState<string[]>([])
  // Default content key (i.e. Block Hash for Block 1 from Mainnet) to test lookups/offers
  const [distance, setDistance] = React.useState<string>('0')
  const [utpConId, setUtpConId] = React.useState<number>()
  const [contentKey, setContentKey] = useState<string>(
    '0x88e96d4537bea4d9c05d12549907b32561d3bf31f45aae734cdc119f13406cb6'
  )
  const [peer, setPeer] = useState<string>('')

  const toast = useToast()

  const updateAddressBook = () => {
    const peerENRs = portal.routingTables.get(SubNetworkIds.HistoryNetwork)!.values()
    const newPeers = peerENRs.map((peer) => peer.nodeId)
    setPeers(newPeers)
  }

  React.useEffect(() => {
    portal.on('NodeAdded', () => updateAddressBook())
    portal.on('NodeRemoved', () => updateAddressBook())
    return () => {
      portal.removeAllListeners()
    }
  }, [])

  const handleClick = () => {
    if (enr) {
      portal.sendPing(enr, network)
      setEnr('')
      updateAddressBook()
    }
    updateAddressBook()
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

  const handleFindRandom = () => {
    const lookupNode = generateRandomNodeIdAtDistance(portal.client.enr.nodeId, 240)
    const nodeLookup = new NodeLookup(portal, lookupNode, SubNetworkIds.HistoryNetwork)
    nodeLookup.startLookup()
  }
  const handlePing = (nodeId: string) => {
    portal.sendPing(nodeId, network)
  }

  const handleFindNodes = (nodeId: string) => {
    portal.sendFindNodes(nodeId, Uint16Array.from([parseInt(distance)]), network)
  }

  useEffect(() => {
    setPeer(peers[peers.length - 1])
  }, [peers])

  React.useEffect(() => {
    finding && setContentKey(finding)

    peers.forEach((peer) => handleFindNodes(peer))
  }, [finding])

  return (
    <VStack>
      <Heading padding={2} size="md">
        Address Book Manager
      </Heading>
      <Input value={enr} placeholder={'Node ENR'} onChange={(evt) => setEnr(evt.target.value)} />
      <Button width={'100%'} onClick={handleClick}>
        Add Node
      </Button>
      <Input
        placeholder="Connection ID"
        onChange={(evt) => setUtpConId(parseInt(evt.target.value))}
        value={utpConId}
      />
      <Button width={'100%'} onClick={handleFindRandom}>
        Lookup Node
      </Button>

      {peers.length > 0 && (
        <Grid rowGap={2} columnGap={1} templateColumns={'7'} templateRows={'5'}>
          <GridItem colSpan={7}>
            <Heading size="sm" textAlign={'center'}>
              Communicate with Peers
            </Heading>
          </GridItem>
          <GridItem rowSpan={5}>
            <Menu autoSelect>
              <MenuOptionGroup onChange={(p) => setPeer(p as string)}>
                {peers.map((_peer, idx) => (
                  <MenuItemOption
                    paddingStart={0}
                    bgColor={peer === _peer ? 'lightblue' : 'white'}
                    key={idx}
                    value={_peer}
                  >
                    {_peer.slice(0, 25)}...
                  </MenuItemOption>
                ))}
              </MenuOptionGroup>
            </Menu>
          </GridItem>
          <GridItem colStart={4} rowStart={2}>
            <Button size="sm" width={'100%'} onClick={() => handlePing(peer)}>
              Send Ping
            </Button>
          </GridItem>
          <GridItem rowStart={3} colStart={4}>
            <Input
              placeholder={'Distance'}
              onChange={(evt) => {
                setDistance(evt.target.value)
              }}
            />
          </GridItem>
          <GridItem colStart={4} rowStart={4}>
            <Button size="sm" onClick={() => handleFindNodes(peer)}>
              Request Nodes from Peer
            </Button>
          </GridItem>
          <GridItem colStart={4} rowStart={5}>
            <Input value={contentKey} onChange={(evt) => setContentKey(evt.target.value)} />
            <Button width={'100%'} size="sm" onClick={() => handleOffer(peer)}>
              Send Offer
            </Button>
          </GridItem>
        </Grid>
      )}
    </VStack>
  )
}

export default AddressBookManager
