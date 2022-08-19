import { ArrowLeftIcon, ArrowRightIcon, CopyIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Divider,
  GridItem,
  Heading,
  HStack,
  IconButton,
  Input,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Tooltip,
  Tr,
  VStack,
} from '@chakra-ui/react'
import {
  ENR,
  fromHexString,
  HistoryNetworkContentKeyUnionType,
  HistoryNetworkContentTypes,
  reassembleBlock,
  shortId,
} from 'portalnetwork'
import React, { Dispatch, SetStateAction, useContext, useState } from 'react'
import { BlockContext, HistoryProtocolContext, PeersContext } from '../ContextHooks'

export interface PeerButtonsProps {
  peerIdx: number
  setPeerIdx: Dispatch<SetStateAction<number>>
  sortedDistList: [number, string[]][]
  peer: ENR
  // peers: ENR[]
}

export default function PeerButtons(props: PeerButtonsProps) {
  const { setBlock } = useContext(BlockContext)
  const peers = useContext(PeersContext)
  const [epoch, setEpoch] = useState(0)
  const { peerIdx, setPeerIdx, sortedDistList, peer } = props
  const [offer, setOffer] = useState<Uint8Array[]>([])
  const [pinging, setPinging] = useState(false)
  const [ponged, setPonged] = useState<boolean | undefined>()
  const [distance, setDistance] = useState('')
  const [blockHash, setBlockHash] = useState('')
  const historyProtocol = useContext(HistoryProtocolContext)
  const addToOffer = (type: string) => {
    const contentKeys: Uint8Array[] = []
    switch (type) {
      case 'header':
        contentKeys.push(
          HistoryNetworkContentKeyUnionType.serialize({
            selector: HistoryNetworkContentTypes.BlockHeader,
            value: {
              chainId: 1,
              blockHash: fromHexString(blockHash),
            },
          })
        )
        break
      case 'body':
        contentKeys.push(
          HistoryNetworkContentKeyUnionType.serialize({
            selector: HistoryNetworkContentTypes.BlockBody,
            value: {
              chainId: 1,
              blockHash: fromHexString(blockHash),
            },
          })
        )
        break
      case 'block':
        contentKeys.push(
          HistoryNetworkContentKeyUnionType.serialize({
            selector: HistoryNetworkContentTypes.BlockHeader,
            value: {
              chainId: 1,
              blockHash: fromHexString(blockHash),
            },
          })
        )
        contentKeys.push(
          HistoryNetworkContentKeyUnionType.serialize({
            selector: HistoryNetworkContentTypes.BlockBody,
            value: {
              chainId: 1,
              blockHash: fromHexString(blockHash),
            },
          })
        )

        break
    }
    setOffer([...offer, ...contentKeys])
  }
  const handlePing = async () => {
    setPinging(true)
    setTimeout(async () => {
      const pong = await historyProtocol.sendPing(peer)
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
    historyProtocol.sendFindNodes(peer.nodeId, [parseInt(distance)])
  }
  const handleRequestSnapshot = () => {
    const accumulatorKey = HistoryNetworkContentKeyUnionType.serialize({
      selector: 4,
      value: { selector: 0, value: null },
    })
    historyProtocol.sendFindContent(peer.nodeId, accumulatorKey)
  }

  const offerSnapshot = () => {
    const accumulatorKey = HistoryNetworkContentKeyUnionType.serialize({
      selector: 4,
      value: { selector: 0, value: null },
    })
    historyProtocol.sendOffer(peer.nodeId, [accumulatorKey])
  }

  const handleOffer = () => {
    historyProtocol.sendOffer(peer.nodeId, offer)
  }
  const sendFindContent = async (type: string) => {
    if (type === 'header') {
      const headerKey = HistoryNetworkContentKeyUnionType.serialize({
        selector: 0,
        value: {
          chainId: 1,
          blockHash: fromHexString(blockHash),
        },
      })
      historyProtocol.sendFindContent(peer.nodeId, headerKey)
    } else if (type === 'body') {
      const headerKey = HistoryNetworkContentKeyUnionType.serialize({
        selector: 0,
        value: {
          chainId: 1,
          blockHash: fromHexString(blockHash),
        },
      })
      historyProtocol.sendFindContent(peer.nodeId, headerKey)
      const bodyKey = HistoryNetworkContentKeyUnionType.serialize({
        selector: 1,
        value: {
          chainId: 1,
          blockHash: fromHexString(blockHash),
        },
      })
      historyProtocol.sendFindContent(peer.nodeId, bodyKey)
    } else if (type === 'block') {
      const headerKey = HistoryNetworkContentKeyUnionType.serialize({
        selector: 0,
        value: {
          chainId: 1,
          blockHash: fromHexString(blockHash),
        },
      })
      const bodyKey = HistoryNetworkContentKeyUnionType.serialize({
        selector: 1,
        value: {
          chainId: 1,
          blockHash: fromHexString(blockHash),
        },
      })
      try {
        const header = (await historyProtocol.sendFindContent(peer.nodeId, headerKey))
          ?.value as Uint8Array
        const _body = await historyProtocol.sendFindContent(peer.nodeId, bodyKey)
        const body: Uint8Array | undefined =
          _body !== undefined ? (_body.value as Uint8Array) : undefined
        const block = reassembleBlock(header, body)
        setBlock(block)
      } catch {}
    } else if (type === 'epoch') {
      const epochKey = HistoryNetworkContentKeyUnionType.serialize({
        selector: 3,
        value: {
          chainId: 1,
          blockHash: historyProtocol.accumulator.historicalEpochs[epoch],
        },
      })
    }
  }
  return (
    <GridItem>
      <Box border={'1px'}>
        <VStack>
          <HStack>
            <VStack>
              <HStack>
                <IconButton
                  disabled={peerIdx < 1}
                  onClick={() => setPeerIdx(peerIdx - 1)}
                  aria-label="prev peer"
                  icon={<ArrowLeftIcon />}
                />
                <Heading size={'md'}>
                  Peer {peerIdx + 1} / {peers.length}
                </Heading>
                <IconButton
                  onClick={() => setPeerIdx(peerIdx + 1)}
                  disabled={peerIdx === peers.length - 1}
                  aria-label="prev peer"
                  icon={<ArrowRightIcon />}
                />
              </HStack>
              <Table size="xs">
                <Tbody>
                  <Tr>
                    <Td>ENR:</Td>
                    <Th>
                      <Tooltip label={props.sortedDistList[peerIdx][1][3]}>
                        <CopyIcon
                          cursor={'pointer'}
                          onClick={() =>
                            navigator.clipboard.writeText(sortedDistList[peerIdx][1][3])
                          }
                        />
                      </Tooltip>
                    </Th>
                  </Tr>
                  <Tr>
                    <Td>Addr: </Td>
                    <Td>
                      {props.sortedDistList[peerIdx][1][0]}: {sortedDistList[peerIdx][1][1]}
                    </Td>
                  </Tr>
                  <Tr>
                    <Td>NodeId: </Td>
                    <Td>{shortId(peer.nodeId)}</Td>
                  </Tr>
                </Tbody>
              </Table>
            </VStack>
            <Button
              size="lg"
              onClick={() => handlePing()}
              bgColor={
                ponged === true
                  ? 'green.100'
                  : ponged === false
                  ? 'red.100'
                  : pinging
                  ? 'yellow.100'
                  : 'blue.100'
              }
            >
              {ponged === true
                ? 'PONG RECEIVED!'
                : ponged === false
                ? 'PING/PONG FAILED'
                : pinging
                ? 'PINGING'
                : 'Send PING'}{' '}
            </Button>
          </HStack>
          <Button width="100%" onClick={() => handleRequestSnapshot()}>
            Request Accumulator Snapshot
          </Button>
          <Button mt="5px" width="100%" onClick={() => offerSnapshot()}>
            Offer Accumulator Snapshot
          </Button>
          <Divider />
          <HStack width={'100%'}>
            <Button
              isDisabled={historyProtocol.accumulator.historicalEpochs.length < 1}
              width="70%"
              onClick={() => sendFindContent('epoch')}
            >
              Request Epoch Accumulator by Epoch
            </Button>
            <Input
              type={'number'}
              min={1}
              max={historyProtocol.accumulator.historicalEpochs.length}
              width={'30%'}
              placeholder={'Epoch'}
              onChange={(evt) => {
                setEpoch(parseInt(evt.target.value))
              }}
            />
          </HStack>
          <Divider />
          <HStack width={'100%'}>
            <Button
              isDisabled={historyProtocol.accumulator.historicalEpochs.length < 1}
              width="70%"
              onClick={() => sendFindContent('epoch')}
            >
              Request Epoch Accumulator by BlockNumber
            </Button>
            <Input
              type={'number'}
              min={1}
              max={historyProtocol.accumulator.currentHeight()}
              width={'30%'}
              placeholder={`BlockNumber (Max: ${historyProtocol.accumulator.currentHeight()})`}
              onChange={(evt) => {
                setEpoch(Math.floor(parseInt(evt.target.value) / 8192))
              }}
            />
          </HStack>
          <Divider />
          <HStack width={'100%'}>
            <Button width="70%" onClick={() => handleFindNodes(peer)}>
              FindNodes
            </Button>
            <Input
              width={'30%'}
              placeholder={'Distance'}
              onChange={(evt) => {
                setDistance(evt.target.value)
              }}
            />
          </HStack>
          <Divider />
          <Input
            value={blockHash}
            placeholder="BlockHash"
            onChange={(evt) => setBlockHash(evt.target.value)}
          />
          <HStack width={'100%'}>
            <Button
              width={'33%'}
              title="Add content to offer"
              onClick={() => {
                sendFindContent('header')
              }}
            >
              Find Header
            </Button>
            <Button
              width={'33%'}
              title="Add content to offer"
              onClick={() => {
                sendFindContent('body')
              }}
            >
              Find Body
            </Button>
            <Button
              width={'33%'}
              title="Add content to offer"
              onClick={() => {
                sendFindContent('block')
              }}
            >
              Find Block
            </Button>
          </HStack>
          <HStack width={'100%'}>
            <Button
              width={'33%'}
              title="Add content to offer"
              onClick={() => {
                addToOffer('header')
              }}
            >
              Offer Header
            </Button>
            <Button
              width={'33%'}
              title="Add content to offer"
              onClick={() => {
                addToOffer('body')
              }}
            >
              Offer Body
            </Button>
            <Button
              width={'33%'}
              title="Add content to offer"
              onClick={() => {
                addToOffer('block')
              }}
            >
              Offer Block
            </Button>
          </HStack>
          <Box width={'90%'} border={'1px'}>
            <Text textAlign={'center'}>OFFER: {offer.length} / 26</Text>
          </Box>
          <Button width={'100%'} onClick={() => handleOffer()}>
            Send Offer
          </Button>
        </VStack>
      </Box>
    </GridItem>
  )
}
