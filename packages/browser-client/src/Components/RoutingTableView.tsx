import React, { useContext, useReducer } from 'react'
import { CopyIcon } from '@chakra-ui/icons'
import {
  Table,
  Center,
  TableCaption,
  Thead,
  Th,
  Tbody,
  Tr,
  Td,
  Tooltip,
  GridItem,
  SimpleGrid,
} from '@chakra-ui/react'
import PeerButtons from './PeerButtons'
import { AppContext, AppContextType, StateChange } from '../globalReducer'
import { PeerContext, peerInitialState, peerReducer } from '../peerReducer'

export default function RoutingTableView() {
  const { state, dispatch } = useContext(AppContext as React.Context<AppContextType>)
  const [_state, _dispatch] = useReducer(peerReducer, peerInitialState)

  return (
    <Center>
      {_state && _dispatch && (
        <PeerContext.Provider value={{ peerState: _state, peerDispatch: _dispatch }}>
          <SimpleGrid width={'100%'} columns={[1, 1, 1, 2]}>
            {state.peers.length > 0 && <PeerButtons />}
            <GridItem>
              <Center>
                <Table size="xs">
                  <TableCaption>Peers: {state.peers.length}</TableCaption>
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
                    {state.sortedPeers.length > 0 &&
                      state.sortedPeers.map((peer, idx) => {
                        return (
                          <Tr
                            key={peer[1][2]}
                            onMouseEnter={() =>
                              dispatch({ type: StateChange.SETHOVER, payload: idx })
                            }
                            onMouseLeave={() => {
                              dispatch({ type: StateChange.SETHOVER, payload: undefined })
                            }}
                            onClick={() => {
                              dispatch({
                                type: StateChange.SETSELECTEDPEER,
                                payload: { idx: idx },
                              })
                            }}
                            backgroundColor={
                              idx === state.hover
                                ? 'blue.100'
                                : state.peerIdx === idx
                                ? 'red.100'
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
              </Center>
            </GridItem>
          </SimpleGrid>
        </PeerContext.Provider>
      )}
    </Center>
  )
}
