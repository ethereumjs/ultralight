import { CopyIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Divider,
  GridItem,
  Heading,
  HStack,
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
import React, { useContext, useEffect, useReducer } from 'react'
import { AppContext, StateChange } from '../globalReducer'

interface PeerButtonsState {
  epoch: number
  offer: Uint8Array[]
  ping: [string, string]
  distance: string
  blockHash: string
}

const peerButtonsInitialState = {
  epoch: 0,
  offer: [],
  ping: ['blue.100', 'PING'] as [string, string],
  distance: '',
  blockHash: '',
}

enum PeerButtonsStateChange {
  SETEPOCH = 'SETEPOCH',
  ADDTOOFFER = 'ADDTOOFFER',
  PING = 'PING',
  SETDISTANCE = 'SETDISTANCE',
  SETBLOCKHASH = 'SETBLOCKHASH',
  SETPEERIDX = 'SETPEERIDX',
}

interface AppStateAction {
  type: PeerButtonsStateChange
  payload?: any
}

const reducer = (state: PeerButtonsState, action: AppStateAction) => {
  const { type, payload } = action
  switch (type) {
    case PeerButtonsStateChange.SETEPOCH:
      return state
    case PeerButtonsStateChange.ADDTOOFFER:
      return {
        ...state,
        offer: [...state.offer, payload],
      }
    case PeerButtonsStateChange.PING:
      return { ...state, ping: payload }
    case PeerButtonsStateChange.SETDISTANCE:
      return state
    case PeerButtonsStateChange.SETBLOCKHASH:
      return { ...state, blockHash: payload }
    default:
      throw new Error()
  }
}

export default function PeerButtons() {
  const { state, dispatch } = useContext(AppContext)
  const [_state, _dispatch] = useReducer(reducer, peerButtonsInitialState)

  useEffect(() => {
    if (!state!.selectedPeer) {
      dispatch!({ type: StateChange.SETSELECTEDPEER, payload: { idx: 0 } })
    }
  }, [])

  const peerIdx = state!.sortedPeers
    .map((peer) => {
      return peer[1][3]
    })
    .indexOf(state!.selectedPeer)

  const addToOffer = (type: string): Uint8Array[] => {
    switch (type) {
      case 'header':
        return [
          HistoryNetworkContentKeyUnionType.serialize({
            selector: HistoryNetworkContentTypes.BlockHeader,
            value: {
              chainId: 1,
              blockHash: fromHexString(_state.blockHash),
            },
          }),
        ]
      case 'body':
        return [
          HistoryNetworkContentKeyUnionType.serialize({
            selector: HistoryNetworkContentTypes.BlockBody,
            value: {
              chainId: 1,
              blockHash: fromHexString(_state.blockHash),
            },
          }),
        ]

      case 'block':
        return [
          HistoryNetworkContentKeyUnionType.serialize({
            selector: HistoryNetworkContentTypes.BlockHeader,
            value: {
              chainId: 1,
              blockHash: fromHexString(_state.blockHash),
            },
          }),
          HistoryNetworkContentKeyUnionType.serialize({
            selector: HistoryNetworkContentTypes.BlockBody,
            value: {
              chainId: 1,
              blockHash: fromHexString(_state.blockHash),
            },
          }),
        ]
      default:
        throw new Error()
    }
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
      const _epochKey = HistoryNetworkContentKeyUnionType.serialize({
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
                <Heading size={'md'}>
                  Peer {peerIdx + 1} / {peers.length}
                </Heading>
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
