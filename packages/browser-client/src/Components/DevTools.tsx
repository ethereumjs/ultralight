import { ENR } from '@chainsafe/discv5'
import {
  Grid,
  Input,
  GridItem,
  Heading,
  Menu,
  MenuOptionGroup,
  MenuItemOption,
  Button,
  Box,
} from '@chakra-ui/react'
import { HistoryNetworkContentKeyUnionType, PortalNetwork, SubNetworkIds } from 'portalnetwork'
import { useState } from 'react'

interface DevToolsProps {
  portal: PortalNetwork
  peers: ENR[]
}

export default function DevTools(props: DevToolsProps) {
  const portal = props.portal
  const peers = props.peers.map((p) => {
    return p.nodeId
  })
  const [peer, setPeer] = useState('')
  const [distance, setDistance] = useState('')
  const [contentKey, setContentKey] = useState('')
  const handlePing = (nodeId: string) => {
    portal.sendPing(nodeId, SubNetworkIds.HistoryNetwork)
  }

  const handleFindNodes = (nodeId: string) => {
    portal.sendFindNodes(
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
    portal.sendOffer(nodeId, [encodedContentKey], SubNetworkIds.HistoryNetwork)
  }
  return (
    <Grid columnGap={1} templateColumns={'repeat(7, 1fr)'}>
      <GridItem rowStart={5} rowSpan={1} colSpan={7}>
        <Box paddingTop={1} border="solid black" height={'200'}>
          <Heading size="sm">Select Peer</Heading>
          <Menu autoSelect>
            <MenuOptionGroup
              overflowY={'scroll'}
              fontSize={'xs'}
              onChange={(p) => setPeer(p as string)}
            >
              {peers.map((_peer, idx) => (
                <MenuItemOption
                  fontSize={'xs'}
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
        </Box>
      </GridItem>
      <GridItem colStart={1} rowStart={0}>
        <Button size="sm" width={'100%'} onClick={() => handlePing(peer)}>
          Send Ping
        </Button>
      </GridItem>
      <GridItem rowStart={2} colStart={0}>
        <Input
          placeholder={'Distance'}
          onChange={(evt) => {
            setDistance(evt.target.value)
          }}
        />
      </GridItem>
      <GridItem colStart={0} rowStart={3}>
        <Button size="sm" onClick={() => handleFindNodes(peer)}>
          Request Nodes from Peer
        </Button>
      </GridItem>
      <GridItem colStart={0} rowStart={4}>
        <Input value={contentKey} onChange={(evt) => setContentKey(evt.target.value)} />
        <Button width={'100%'} size="sm" onClick={() => handleOffer(peer)}>
          Send Offer
        </Button>
      </GridItem>
    </Grid>
  )
}
