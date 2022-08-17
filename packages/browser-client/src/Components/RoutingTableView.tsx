import React, { useContext, useState } from 'react'
import { ENR, fromHexString, HistoryNetworkContentKeyUnionType, shortId } from 'portalnetwork'
import { ArrowLeftIcon, ArrowRightIcon, CopyIcon } from '@chakra-ui/icons'
import {
  Table,
  Box,
  Center,
  TableCaption,
  Thead,
  Th,
  Tbody,
  Tr,
  Td,
  Tooltip,
  VStack,
  HStack,
  Button,
  Divider,
  Input,
  useToast,
  Text,
  GridItem,
  SimpleGrid,
  IconButton,
  Heading,
} from '@chakra-ui/react'
import { HistoryProtocolContext } from '../App'
import PeerButtons from './PeerButtons'

interface RoutingTableViewProps {
  peers: ENR[]
  sortedDistList: [number, string[]][]
}

export default function RoutingTableView(props: RoutingTableViewProps) {
  const [peerIdx, setPeerIdx] = useState(0)
  const [hover, setHover] = useState<number>()
  const [peer, _setPeer] = useState(props.peers[peerIdx])
  const [distance, setDistance] = useState('')
  const [blockHash, setBlockHash] = useState('')
  const [offer, setOffer] = useState<string[]>([])
  const [pinging, setPinging] = useState(false)
  const [ponged, setPonged] = useState<boolean | undefined>()
  const toast = useToast()

  const protocol = useContext(HistoryProtocolContext)

  const handlePing = async () => {
    setPinging(true)
    setTimeout(async () => {
      const pong = await protocol.sendPing(peer)
      if (pong) {
        setPonged(true)
        setTimeout(() => {
          setPinging(false)
          setPonged(undefined)
        }, 1500)
      } else {
        setPonged(false)
        setTimeout(() => {
          setPinging(false)
          setPonged(undefined)
        }, 1000)
      }
    }, 500)
  }
  const handleFindNodes = (peer: ENR) => {
    protocol.sendFindNodes(peer.nodeId, [parseInt(distance)])
  }
  const handleRequestSnapshot = () => {
    const accumulatorKey = HistoryNetworkContentKeyUnionType.serialize({
      selector: 4,
      value: { selector: 0, value: null },
    })
    protocol.sendFindContent(peer.nodeId, accumulatorKey)
  }

  const handleOffer = (peer: ENR) => {
    if (blockHash.slice(0, 2) !== '0x') {
      setBlockHash('')
      toast({
        title: 'Invalid content key',
        description: 'Key must be hex prefixed',
        status: 'warning',
      })
      return
    }
    protocol.sendOffer(peer.nodeId, [fromHexString(blockHash)])
  }

  const addToOffer = () => {
    setOffer([...offer, blockHash])
  }

  return (
    <Center>
      {/* <Box width={'90%'} maxHeight="10%"> */}
      <SimpleGrid width={'100%'} columns={[1, 1, 1, 2]}>
        <PeerButtons
          peers={props.peers}
          peer={peer}
          setPeerIdx={setPeerIdx}
          peerIdx={peerIdx}
          sortedDistList={props.sortedDistList}
        />
        <GridItem>
          <Center>
            <Table size="xs">
              <TableCaption>Peers: {props.peers?.length}</TableCaption>
              <Thead>
                <Tr>
                  <Th>ENR</Th>
                  <Th>DIST</Th>
                  <Th>IP</Th>
                  <Th>PORT</Th>
                  <Th>NodeId</Th>
                </Tr>
              </Thead>
              <Tbody>
                {props.sortedDistList.map((peer, idx) => {
                  return (
                    <Tr
                      key={peer[1][2]}
                      onMouseEnter={() => setHover(idx)}
                      onMouseLeave={() => {
                        setHover(undefined)
                      }}
                      onClick={() => setPeerIdx(idx)}
                      backgroundColor={
                        idx === hover ? 'blue.100' : peerIdx === idx ? 'red.100' : 'whiteAlpha.100'
                      }
                    >
                      <Td key={peer[1][2] + 'abc'}>
                        <Tooltip label={peer[1][3]}>
                          <CopyIcon
                            cursor={'pointer'}
                            onClick={() => navigator.clipboard.writeText(peer[1][3])}
                          />
                        </Tooltip>
                      </Td>
                      <Th>{peer[0]}</Th>
                      <Td>{peer[1][0]}</Td>
                      <Td>{peer[1][1]}</Td>
                      <Td>{peer[1][2].slice(0, 15) + '...'}</Td>
                    </Tr>
                  )
                })}
              </Tbody>
            </Table>
          </Center>
        </GridItem>
      </SimpleGrid>
    </Center>
  )
}
