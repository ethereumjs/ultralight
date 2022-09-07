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
    _dispatch({ type: PeerButtonsStateChange.PING, payload: ['yellow.200', 'PINGING'] })
    setTimeout(async () => {
      const pong = await state!.historyProtocol!.sendPing(ENR.decodeTxt(state!.selectedPeer))
      if (pong) {
        _dispatch({ type: PeerButtonsStateChange.PING, payload: ['green.200', 'PONG RECEIVED!'] })
        setTimeout(() => {
          _dispatch({ type: PeerButtonsStateChange.PING, payload: ['blue.200', 'PING'] })
        }, 1500)
      } else {
        _dispatch({ type: PeerButtonsStateChange.PING, payload: ['red.200', 'PING FAILED'] })
        setTimeout(() => {
          _dispatch({ type: PeerButtonsStateChange.PING, payload: ['blue.200', 'PINGING'] })
        }, 1000)
      }
    }, 500)
  }
  const handleFindNodes = (peer: ENR) => {
    state!.historyProtocol!.sendFindNodes(peer.nodeId, [parseInt(_state.distance)])
  }
  const handleRequestSnapshot = () => {
    const accumulatorKey = HistoryNetworkContentKeyUnionType.serialize({
      selector: 4,
      value: { selector: 0, value: null },
    })
    state!.historyProtocol!.sendFindContent(
      ENR.decodeTxt(state!.selectedPeer).nodeId,
      accumulatorKey
    )
  }

  const handleOffer = () => {
    state!.historyProtocol!.sendOffer(ENR.decodeTxt(state!.selectedPeer).nodeId, _state.offer)
  }
  const sendFindContent = async (type: string) => {
    if (type === 'header') {
      const headerKey = HistoryNetworkContentKeyUnionType.serialize({
        selector: 0,
        value: {
          chainId: 1,
          blockHash: fromHexString(_state.blockHash),
        },
      })
      const header = await state!.historyProtocol!.sendFindContent(
        ENR.decodeTxt(state!.selectedPeer).nodeId,
        headerKey
      )
      const block = reassembleBlock(header!.value as Uint8Array, undefined)
      dispatch!({ type: StateChange.SETBLOCK, payload: block })
    } else if (type === 'body') {
      const headerKey = HistoryNetworkContentKeyUnionType.serialize({
        selector: 0,
        value: {
          chainId: 1,
          blockHash: fromHexString(_state.blockHash),
        },
      })
      state!.historyProtocol!.sendFindContent(ENR.decodeTxt(state!.selectedPeer).nodeId, headerKey)
      const bodyKey = HistoryNetworkContentKeyUnionType.serialize({
        selector: 1,
        value: {
          chainId: 1,
          blockHash: fromHexString(_state.blockHash),
        },
      })
      state!.historyProtocol!.sendFindContent(ENR.decodeTxt(state!.selectedPeer).nodeId, bodyKey)
    } else if (type === 'block') {
      const headerKey = HistoryNetworkContentKeyUnionType.serialize({
        selector: 0,
        value: {
          chainId: 1,
          blockHash: fromHexString(_state.blockHash),
        },
      })
      const bodyKey = HistoryNetworkContentKeyUnionType.serialize({
        selector: 1,
        value: {
          chainId: 1,
          blockHash: fromHexString(_state.blockHash),
        },
      })
      try {
        const header = (
          await state!.historyProtocol!.sendFindContent(
            ENR.decodeTxt(state!.selectedPeer).nodeId,
            headerKey
          )
        )?.value as Uint8Array
        const _body = await state!.historyProtocol!.sendFindContent(
          ENR.decodeTxt(state!.selectedPeer).nodeId,
          bodyKey
        )
        const body: Uint8Array | undefined =
          _body !== undefined ? (_body.value as Uint8Array) : undefined
        const block = reassembleBlock(header, body)
        dispatch!({ type: StateChange.SETBLOCK, payload: block })
      } catch {}
    } else if (type === 'epoch') {
      const _epochKey = HistoryNetworkContentKeyUnionType.serialize({
        selector: 3,
        value: {
          chainId: 1,
          blockHash: state!.historyProtocol!.accumulator.historicalEpochs()[_state.epoch],
        },
      })
    }
  }
  return (
    <GridItem>
      {state && dispatch && (
        <Box border={'1px'}>
          <VStack>
            <HStack>
              <VStack>
                <HStack>
                  <Heading size={'md'}>
                    Peer {peerIdx + 1} / {state!.peers.length}
                  </Heading>
                </HStack>
                <Table size="xs">
                  {state?.sortedPeers[peerIdx] && (
                    <Tbody>
                      <Tr>
                        <Td>ENR:</Td>
                        <Th>
                          <Tooltip label={state!.sortedPeers[peerIdx][1][3]}>
                            <CopyIcon
                              cursor={'pointer'}
                              onClick={() =>
                                navigator.clipboard.writeText(state!.sortedPeers[peerIdx][1][3])
                              }
                            />
                          </Tooltip>
                        </Th>
                      </Tr>
                      <Tr>
                        <Td>Addr: </Td>
                        <Td>
                          {state!.sortedPeers[peerIdx][1][0]}: {state!.sortedPeers[peerIdx][1][1]}
                        </Td>
                      </Tr>
                      <Tr>
                        <Td>NodeId: </Td>
                        <Td>{shortId(ENR.decodeTxt(state!.selectedPeer).nodeId)}</Td>
                      </Tr>
                    </Tbody>
                  )}
                </Table>
              </VStack>
              <Button size="lg" onClick={() => handlePing()} bgColor={_state.ping[0]}>
                {_state.ping[1]}
              </Button>
            </HStack>
            <Button width="100%" onClick={() => handleRequestSnapshot()}>
              Request Accumulator Snapshot
            </Button>
            <Divider />
            <HStack width={'100%'}>
              <Button
                isDisabled={state!.historyProtocol!.accumulator.historicalEpochs.length < 1}
                width="70%"
                onClick={() => sendFindContent('epoch')}
              >
                Request Epoch Accumulator by Epoch
              </Button>
              <Input
                type={'number'}
                min={1}
                max={state!.historyProtocol!.accumulator.historicalEpochs.length}
                width={'30%'}
                placeholder={'Epoch'}
                onChange={(evt) => {
                  _dispatch({
                    type: PeerButtonsStateChange.SETEPOCH,
                    payload: parseInt(evt.target.value),
                  })
                }}
              />
            </HStack>
            <Divider />
            <HStack width={'100%'}>
              <Button
                isDisabled={state!.historyProtocol!.accumulator.historicalEpochs.length < 1}
                width="70%"
                onClick={() => sendFindContent('epoch')}
              >
                Request Epoch Accumulator by BlockNumber
              </Button>
              <Input
                type={'number'}
                min={1}
                max={state!.historyProtocol!.accumulator.currentHeight()}
                width={'30%'}
                placeholder={`BlockNumber (Max: ${state!.historyProtocol!.accumulator.currentHeight()})`}
                onChange={(evt) => {
                  _dispatch({
                    type: PeerButtonsStateChange.SETEPOCH,
                    payload: Math.floor(parseInt(evt.target.value) / 8192),
                  })
                }}
              />
            </HStack>
            <Divider />
            {state.selectedPeer && (
              <HStack width={'100%'}>
                <Button
                  width="70%"
                  onClick={() => handleFindNodes(ENR.decodeTxt(state!.selectedPeer))}
                >
                  FindNodes
                </Button>
                <Input
                  width={'30%'}
                  placeholder={'Distance'}
                  onChange={(evt) => {
                    _dispatch({
                      type: PeerButtonsStateChange.SETDISTANCE,
                      payload: evt.target.value,
                    })
                  }}
                />
              </HStack>
            )}
            <Divider />
            <Input
              value={_state.blockHash}
              placeholder="BlockHash"
              onChange={(evt) =>
                _dispatch({ type: PeerButtonsStateChange.SETBLOCKHASH, payload: evt.target.value })
              }
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
              <Text textAlign={'center'}>OFFER: {_state.offer.length} / 26</Text>
            </Box>
            <Button width={'100%'} onClick={() => handleOffer()}>
              Send Offer
            </Button>
          </VStack>
        </Box>
      )}
    </GridItem>
  )
}
