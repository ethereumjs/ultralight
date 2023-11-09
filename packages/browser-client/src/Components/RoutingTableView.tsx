import React, { useContext, useReducer, useState } from 'react'
import { CopyIcon } from '@chakra-ui/icons'
import {
  Table,
  Thead,
  Th,
  Tbody,
  Tr,
  Td,
  Tooltip,
  Text,
  Button,
  Input,
  VStack,
  Box,
  HStack,
} from '@chakra-ui/react'
import PeerButtons from './PeerButtons'
import { AppContext, AppContextType, StateChange } from '../globalReducer'
import { PeerContext, peerInitialState, peerReducer } from '../peerReducer'

export default function RoutingTableView() {
  const { state, dispatch } = useContext(AppContext as React.Context<AppContextType>)
  const [_state, _dispatch] = useReducer(peerReducer, peerInitialState)
  const [searchString, setSearchString] = useState('')
  let location: string | undefined
  try {
    location = state.provider!.portal.discv5.enr.getLocationMultiaddr('udp')!.toString()
  } catch {
    location = undefined
  }

  async function connectToPeer() {
    try {
      await state.provider?.historyNetwork.addBootNode(state.searchEnr)
      dispatch({ type: StateChange.SETSEARCHENR, payload: '' })
      dispatch({ type: StateChange.REFRESHPEERS })
    } catch (err) {}
  }

  return (
    <PeerContext.Provider value={{ peerState: _state, peerDispatch: _dispatch }}>
      <VStack spacing={0} width={'100%'}>
        <Box width="100%" border={'1px'}>
          {<PeerButtons />}
        </Box>
        <HStack width="100%" bg="gray.500" color={'whiteAlpha.900'} boxShadow={'xl'}>
          <Text fontSize="xs" size="xs" width={'20%'} textAlign={'center'} fontWeight={'bold'}>
            Peers: {state.peers.length}
          </Text>
          <Input
            width={'80%'}
            bg="white"
            size="xs"
            type="text"
            placeholder="search by nodeId"
            onChange={(e) => setSearchString(e.target.value)}
          />
        </HStack>
        <Text>{location}</Text>
        <Box height={'40vh'} width="100%" boxShadow={'md'} overflowY={'scroll'}>
          <Table fontSize={'x-small'} size="xs" overflowY={'scroll'}>
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
              {state.sortedPeers.filter((n) => n[1][2].includes(searchString)).length > 0 &&
                state.sortedPeers
                  .filter((n) => n[1][2].includes(searchString))
                  .map((peer, idx) => {
                    return (
                      <Tr
                        key={peer[1][2]}
                        onMouseEnter={() => dispatch({ type: StateChange.SETHOVER, payload: idx })}
                        onMouseLeave={() => {
                          dispatch({ type: StateChange.SETHOVER, payload: undefined })
                        }}
                        onClick={() => {
                          dispatch({
                            type: StateChange.SETSELECTEDPEER,
                            payload: {
                              idx: state.sortedPeers.indexOf(peer),
                            },
                          })
                        }}
                        backgroundColor={
                          idx === state.hover
                            ? 'blue.100'
                            : state.peerIdx === idx
                            ? 'green.100'
                            : 'whiteAlpha.100'
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
        </Box>
        <Box width="100%" boxShadow={'xl'}>
          <VStack paddingY={'4px'} width="100%" opacity={1} bg="gray.500">
            <Button
              width={'90%'}
              border="gray.500"
              bgColor={'blue.100'}
              size={'xs'}
              marginBottom={'2px'}
              onClick={connectToPeer}
            >
              Connect to new peer
            </Button>
            <Input
              rounded={'md'}
              width={'90%'}
              bg="white"
              border="2px"
              size={'xs'}
              type="text"
              style={{ marginTop: '0' }}
              placeholder={'enr: IS...'}
              value={state.searchEnr}
              onChange={(e) => {
                dispatch({ type: StateChange.SETSEARCHENR, payload: e.target.value })
              }}
            />
          </VStack>
        </Box>
      </VStack>
    </PeerContext.Provider>
  )
}
